<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\BirTaxTable;
use App\Models\Employee;
use App\Models\EmployeeRecurringDeduction;
use App\Models\Payslip;
use App\Models\PayrollPeriod;
use App\Models\PayrollRecord;
use App\Models\SssContributionTable;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PayrollService
{
    public function createPeriod(array $data, User $creator): PayrollPeriod
    {
        return PayrollPeriod::create([
            'name' => $data['name'],
            'period_start' => $data['period_start'],
            'period_end' => $data['period_end'],
            'notes' => $data['notes'] ?? null,
            'status' => 'draft',
            'created_by' => $creator->id,
        ]);
    }

    public function computePayroll(PayrollPeriod $period, User $operator): Collection
    {
        if ($period->status !== 'draft') {
            throw new \RuntimeException('Can only compute payroll for draft periods.');
        }

        return DB::transaction(function () use ($period, $operator) {
            $employees = Employee::where('is_active', true)->get();
            $results = collect();

            foreach ($employees as $employee) {
                $attendance = AttendanceRecord::where('employee_id', $employee->id)
                    ->where('payroll_period_id', $period->id)
                    ->first();

                if (!$attendance) {
                    continue;
                }

                $results->push($this->computeForEmployee($employee, $period, $attendance, $operator));
            }

            return $results;
        });
    }

    public function computeForEmployee(
        Employee $employee,
        PayrollPeriod $period,
        AttendanceRecord $attendance,
        User $operator
    ): PayrollRecord {
        $dailyRate = $this->getDailyRate($employee);
        $basicPay = $this->computeBasicPay($employee, $attendance, $dailyRate);
        $overtimePay = $this->computeOvertimePay($dailyRate, (float) $attendance->overtime_hours);
        $holidayPay = $this->computeHolidayPay($employee, $attendance, $dailyRate);
        $allowances = 0; // manual override later
        $lateDeduction = (float) $attendance->late_deduction;

        $grossPay = $basicPay + $overtimePay + $holidayPay + $allowances - $lateDeduction;

        // Government deductions are based on monthly equivalent
        $monthlyBasis = $this->toMonthlyEquivalent($employee);

        $sss = $this->computeSSS($monthlyBasis);
        $phil = $this->computePhilHealth($monthlyBasis);
        $pagibig = $this->computePagIBIG($monthlyBasis);

        // Fixed employee-share defaults per company policy
        $sss['employee']      = 225.00;
        $phil['employee']     = 125.00;
        $pagibig['employee']  = 100.00;

        $taxableIncome = $grossPay - $sss['employee'] - $phil['employee'] - $pagibig['employee'];
        $bir = $this->computeWithholdingTax($taxableIncome, $employee->tax_status ?? 'S');

        // Auto-apply recurring deductions
        $recurringDeductions = $this->getRecurringDeductions($employee, $period);
        $cashAdvance = $recurringDeductions['cash_advance'];
        $loanDeduction = $recurringDeductions['loan'];
        $otherRecurring = $recurringDeductions['other'];

        $totalDeductions = $sss['employee'] + $phil['employee'] + $pagibig['employee']
            + $bir + $lateDeduction + $cashAdvance + $loanDeduction + $otherRecurring;
        $netPay = $grossPay - $totalDeductions;

        return PayrollRecord::updateOrCreate(
            [
                'payroll_period_id' => $period->id,
                'employee_id' => $employee->id,
            ],
            [
                'basic_pay' => round($basicPay, 2),
                'overtime_pay' => round($overtimePay, 2),
                'holiday_pay' => round($holidayPay, 2),
                'allowances' => round($allowances, 2),
                'gross_pay' => round($grossPay, 2),
                'sss_employee' => round($sss['employee'], 2),
                'philhealth_employee' => round($phil['employee'], 2),
                'pagibig_employee' => round($pagibig['employee'], 2),
                'bir_withholding_tax' => round($bir, 2),
                'sss_employer' => round($sss['employer'], 2),
                'sss_ec' => round($sss['ec'], 2),
                'philhealth_employer' => round($phil['employer'], 2),
                'pagibig_employer' => round($pagibig['employer'], 2),
                'late_deduction' => round($lateDeduction, 2),
                'other_deductions' => round($otherRecurring, 2),
                'cash_advance' => round($cashAdvance, 2),
                'loan_deduction' => round($loanDeduction, 2),
                'total_deductions' => round($totalDeductions, 2),
                'net_pay' => round($netPay, 2),
                'pay_type' => $employee->pay_type,
                'basic_salary_snapshot' => $employee->basic_salary,
                'days_present' => $attendance->days_present,
                'days_absent' => $attendance->days_absent,
                'overtime_hours' => $attendance->overtime_hours,
                'status' => 'draft',
                'computed_by' => $operator->id,
            ]
        );
    }

    public function computeBasicPay(Employee $employee, AttendanceRecord $attendance, float $dailyRate): float
    {
        // Both monthly and daily: daily_rate × days_present
        // For monthly: daily_rate = basic_salary / monthly_divisor (e.g. 313)
        // This correctly pro-rates semi-monthly or any partial-period payroll.
        return $dailyRate * (float) $attendance->days_present;
    }

    public function computeOvertimePay(float $dailyRate, float $overtimeHours): float
    {
        if ($overtimeHours <= 0) {
            return 0;
        }

        $hourlyRate = $dailyRate / 8;

        return $hourlyRate * 1.25 * $overtimeHours;
    }

    public function computeHolidayPay(Employee $employee, AttendanceRecord $attendance, float $dailyRate): float
    {
        $holidayPay = 0;

        if ($employee->pay_type === 'daily') {
            // RH not worked but eligible — 100% of daily rate
            $holidayPay += $attendance->regular_holidays_not_worked * $dailyRate * 1.00;
            // RH worked — extra 100% premium (base already in days_present)
            $holidayPay += $attendance->regular_holidays_worked * $dailyRate * 1.00;
            // SNW worked — extra 30% premium (base already in days_present)
            $holidayPay += $attendance->special_holidays_worked * $dailyRate * 0.30;
            // RH on rest day worked — full 260% (not in days_present)
            $holidayPay += $attendance->regular_holidays_restday_worked * $dailyRate * 2.60;
            // SNW on rest day worked — full 150% (not in days_present)
            $holidayPay += $attendance->special_holidays_restday_worked * $dailyRate * 1.50;
        } else {
            // Monthly: RH not worked = 0 (already in salary)
            // RH worked — extra 100% on top of monthly
            $holidayPay += $attendance->regular_holidays_worked * $dailyRate * 1.00;
            // SNW worked — extra 30%
            $holidayPay += $attendance->special_holidays_worked * $dailyRate * 0.30;
            // RH on rest day worked — extra 160% (monthly covers base 100%)
            $holidayPay += $attendance->regular_holidays_restday_worked * $dailyRate * 1.60;
            // SNW on rest day worked — extra 50%
            $holidayPay += $attendance->special_holidays_restday_worked * $dailyRate * 0.50;
        }

        return round($holidayPay, 2);
    }

    public function computeSSS(float $monthlyCompensation): array
    {
        $row = SssContributionTable::lookupByCompensation($monthlyCompensation);

        if (!$row) {
            $row = SssContributionTable::where('is_active', true)->orderBy('range_from')->first();
        }

        if (!$row) {
            return ['employee' => 0, 'employer' => 0, 'ec' => 0];
        }

        return [
            'employee' => (float) $row->employee_share,
            'employer' => (float) $row->employer_share,
            'ec' => (float) $row->ec_share,
        ];
    }

    public function computePhilHealth(float $monthlyBasic): array
    {
        $totalPremium = $monthlyBasic * 0.05;
        $totalPremium = max($totalPremium, 500.00);
        $totalPremium = min($totalPremium, 10000.00);

        $employeeShare = round($totalPremium / 2, 2);
        $employerShare = round($totalPremium / 2, 2);

        return [
            'employee' => $employeeShare,
            'employer' => $employerShare,
        ];
    }

    public function computePagIBIG(float $monthlyBasic): array
    {
        $employeeRate = $monthlyBasic <= 1500.00 ? 0.01 : 0.02;
        $employeeShare = round($monthlyBasic * $employeeRate, 2);
        $employeeShare = min($employeeShare, 200.00);

        $employerShare = round($monthlyBasic * 0.02, 2);

        return [
            'employee' => $employeeShare,
            'employer' => $employerShare,
        ];
    }

    public function computeWithholdingTax(float $taxableIncome, string $taxStatus): float
    {
        if ($taxableIncome <= 0) {
            return 0.00;
        }

        $bracket = BirTaxTable::lookupBracket($taxStatus, $taxableIncome);

        if (!$bracket || (float) $bracket->tax_rate == 0) {
            return 0.00;
        }

        $tax = (float) $bracket->base_tax
            + (($taxableIncome - (float) $bracket->excess_over) * (float) $bracket->tax_rate);

        return round(max(0.00, $tax), 2);
    }

    public function lockPeriod(PayrollPeriod $period, User $approver): PayrollPeriod
    {
        if ($period->status !== 'draft') {
            throw new \RuntimeException('Can only lock draft periods.');
        }

        $period->update([
            'status' => 'locked',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        $period->payrollRecords()->where('status', 'draft')->update(['status' => 'confirmed']);

        return $period->fresh();
    }

    public function unlockPeriod(PayrollPeriod $period): PayrollPeriod
    {
        if ($period->status !== 'locked') {
            throw new \RuntimeException('Only locked periods can be unlocked.');
        }

        $period->update([
            'status'      => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        $period->payrollRecords()->where('status', 'confirmed')->update(['status' => 'draft']);

        return $period->fresh();
    }

    public function markPeriodPaid(PayrollPeriod $period, User $operator): PayrollPeriod
    {
        if ($period->status !== 'locked') {
            throw new \RuntimeException('Can only mark locked periods as paid.');
        }

        $now = now();

        $period->update([
            'status' => 'paid',
            'paid_at' => $now,
        ]);

        $period->payrollRecords()->where('status', 'confirmed')->update([
            'status' => 'paid',
            'paid_at' => $now,
        ]);

        return $period->fresh();
    }

    public function generatePayslip(PayrollRecord $record, User $generator): Payslip
    {
        if ($record->payslip) {
            return $record->payslip;
        }

        return Payslip::create([
            'payroll_record_id' => $record->id,
            'employee_id' => $record->employee_id,
            'payroll_period_id' => $record->payroll_period_id,
            'payslip_number' => $this->generatePayslipNumber(),
            'generated_at' => now(),
            'generated_by' => $generator->id,
        ]);
    }

    public function generatePayslipsForPeriod(PayrollPeriod $period, User $generator): Collection
    {
        $records = $period->payrollRecords()
            ->whereDoesntHave('payslip')
            ->get();

        return $records->map(fn ($record) => $this->generatePayslip($record, $generator));
    }

    private function generatePayslipNumber(): string
    {
        $date = now()->format('Ymd');
        $lastPayslip = Payslip::where('payslip_number', 'like', "PS-{$date}-%")
            ->orderByDesc('payslip_number')
            ->first();

        if ($lastPayslip) {
            $lastSeq = (int) substr($lastPayslip->payslip_number, -4);
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return sprintf('PS-%s-%04d', $date, $nextSeq);
    }

    private function getDailyRate(Employee $employee): float
    {
        if ($employee->pay_type === 'monthly') {
            // monthly_divisor (e.g. 313) is the annual working-days divisor.
            // daily_rate = (monthly_salary × 12) / annual_working_days
            return round((float) $employee->basic_salary * 12 / ($employee->monthly_divisor ?: 313), 2);
        }

        return (float) $employee->basic_salary;
    }

    private function toMonthlyEquivalent(Employee $employee): float
    {
        if ($employee->pay_type === 'monthly') {
            return (float) $employee->basic_salary;
        }

        return (float) $employee->basic_salary * ($employee->standard_work_days ?: 26);
    }

    /**
     * Get recurring deductions for an employee for a period.
     * Deducts from remaining balance and deactivates when fully paid.
     */
    private function getRecurringDeductions(Employee $employee, PayrollPeriod $period): array
    {
        $deductions = EmployeeRecurringDeduction::where('employee_id', $employee->id)
            ->active()
            ->where('start_date', '<=', $period->period_end)
            ->where(function ($q) use ($period) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $period->period_start);
            })
            ->get();

        $cashAdvance = 0;
        $loan = 0;
        $other = 0;

        foreach ($deductions as $deduction) {
            $amount = min((float) $deduction->amount_per_period, (float) $deduction->amount_remaining);

            match ($deduction->type) {
                'cash_advance' => $cashAdvance += $amount,
                'loan' => $loan += $amount,
                default => $other += $amount,
            };

            // Deduct from remaining balance
            $deduction->decrement('amount_remaining', $amount);
            if ($deduction->amount_remaining <= 0) {
                $deduction->update(['is_active' => false]);
            }
        }

        return ['cash_advance' => $cashAdvance, 'loan' => $loan, 'other' => $other];
    }

    /**
     * Compute 13th month pay for an employee for a given year.
     * Formula: Total basic pay earned during the year / 12
     */
    public function compute13thMonthPay(Employee $employee, int $year): float
    {
        $totalBasicPay = PayrollRecord::where('employee_id', $employee->id)
            ->whereHas('payrollPeriod', function ($q) use ($year) {
                $q->whereYear('period_start', $year);
            })
            ->whereIn('status', ['confirmed', 'paid'])
            ->sum('basic_pay');

        return round((float) $totalBasicPay / 12, 2);
    }

    /**
     * Compute 13th month pay for all active employees for a given year.
     */
    public function compute13thMonthPayForAll(int $year): Collection
    {
        return Employee::where('is_active', true)->get()->map(function ($employee) use ($year) {
            return [
                'employee_id' => $employee->id,
                'employee_name' => $employee->full_name,
                'employee_number' => $employee->employee_number,
                'amount' => $this->compute13thMonthPay($employee, $year),
            ];
        });
    }
}
