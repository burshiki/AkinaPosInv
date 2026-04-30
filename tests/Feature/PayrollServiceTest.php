<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\BirTaxTable;
use App\Models\Employee;
use App\Models\EmployeeRecurringDeduction;
use App\Models\PayrollPeriod;
use App\Models\PayrollRecord;
use App\Models\SssContributionTable;
use App\Models\User;
use App\Services\PayrollService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollServiceTest extends TestCase
{
    use RefreshDatabase;

    private PayrollService $payrollService;
    private User $operator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->payrollService = app(PayrollService::class);
        $this->operator = User::factory()->create();
    }

    private function createPeriod(array $overrides = []): PayrollPeriod
    {
        return PayrollPeriod::create(array_merge([
            'name' => 'Jan 1-15 2025',
            'period_start' => '2025-01-01',
            'period_end' => '2025-01-15',
            'status' => 'draft',
            'created_by' => $this->operator->id,
        ], $overrides));
    }

    private function createAttendance(Employee $employee, PayrollPeriod $period, array $overrides = []): AttendanceRecord
    {
        return AttendanceRecord::create(array_merge([
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'days_present' => 13,
            'days_absent' => 0,
            'days_late' => 0,
            'overtime_hours' => 0,
            'late_deduction' => 0,
            'regular_holidays_not_worked' => 0,
            'regular_holidays_worked' => 0,
            'special_holidays_worked' => 0,
            'regular_holidays_restday_worked' => 0,
            'special_holidays_restday_worked' => 0,
            'recorded_by' => $this->operator->id,
        ], $overrides));
    }

    private function seedSssTable(): void
    {
        Model::unguard();
        SssContributionTable::create([
            'range_from' => 0,
            'range_to' => 4249.99,
            'msc' => 4000,
            'employee_share' => 180.00,
            'employer_share' => 380.00,
            'ec_share' => 10.00,
            'total_contribution' => 570.00,
            'is_active' => true,
        ]);
        SssContributionTable::create([
            'range_from' => 4250.00,
            'range_to' => 24749.99,
            'msc' => 15000,
            'employee_share' => 675.00,
            'employer_share' => 1425.00,
            'ec_share' => 10.00,
            'total_contribution' => 2110.00,
            'is_active' => true,
        ]);
        Model::reguard();
    }

    private function seedBirTable(): void
    {
        Model::unguard();
        // Simplified BIR brackets for testing
        BirTaxTable::create([
            'tax_status' => 'all',
            'range_from' => 0,
            'range_to' => 10417,
            'base_tax' => 0,
            'excess_over' => 0,
            'tax_rate' => 0,
            'is_active' => true,
        ]);
        BirTaxTable::create([
            'tax_status' => 'all',
            'range_from' => 10417.01,
            'range_to' => 16666,
            'base_tax' => 0,
            'excess_over' => 10417,
            'tax_rate' => 0.15,
            'is_active' => true,
        ]);
        BirTaxTable::create([
            'tax_status' => 'all',
            'range_from' => 16666.01,
            'range_to' => 33332,
            'base_tax' => 937.50,
            'excess_over' => 16667,
            'tax_rate' => 0.20,
            'is_active' => true,
        ]);
        Model::reguard();
    }

    // ── Basic Pay (Daily) ──

    public function test_daily_basic_pay_calculation(): void
    {
        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, ['days_present' => 13]);

        $basicPay = $this->payrollService->computeBasicPay($employee, $attendance);

        $this->assertEquals(7800.00, $basicPay); // 600 * 13
    }

    // ── Basic Pay (Monthly) ──

    public function test_monthly_basic_pay_calculation(): void
    {
        $employee = Employee::factory()->monthly(15000.00)->create([
            'standard_work_days' => 26,
        ]);
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, ['days_present' => 13]);

        $basicPay = $this->payrollService->computeBasicPay($employee, $attendance);

        // daily_rate = 15000 / 26 = 576.92 (rounded)
        $dailyRate = round(15000 / 26, 2);
        $expected = $dailyRate * 13;
        $this->assertEquals($expected, $basicPay);
    }

    // ── Overtime Pay ──

    public function test_overtime_pay_at_125_percent(): void
    {
        $dailyRate = 600.00;
        $overtimeHours = 4.0;

        $overtimePay = $this->payrollService->computeOvertimePay($dailyRate, $overtimeHours);

        // hourly = 600/8 = 75; OT = 75 * 1.25 * 4 = 375
        $this->assertEquals(375.00, $overtimePay);
    }

    public function test_zero_overtime_returns_zero(): void
    {
        $this->assertEquals(0, $this->payrollService->computeOvertimePay(600, 0));
    }

    public function test_negative_overtime_returns_zero(): void
    {
        $this->assertEquals(0, $this->payrollService->computeOvertimePay(600, -1));
    }

    // ── Holiday Pay (Daily) ──

    public function test_daily_holiday_pay_regular_holiday_worked(): void
    {
        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'regular_holidays_worked' => 1,
        ]);

        $holidayPay = $this->payrollService->computeHolidayPay($employee, $attendance);

        // daily: RH worked => extra 100% premium => 600 * 1.00 = 600
        $this->assertEquals(600.00, $holidayPay);
    }

    public function test_daily_holiday_pay_regular_not_worked(): void
    {
        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'regular_holidays_not_worked' => 1,
        ]);

        $holidayPay = $this->payrollService->computeHolidayPay($employee, $attendance);

        // daily: RH not worked => 100% of daily rate => 600
        $this->assertEquals(600.00, $holidayPay);
    }

    public function test_daily_special_holiday_worked(): void
    {
        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'special_holidays_worked' => 1,
        ]);

        $holidayPay = $this->payrollService->computeHolidayPay($employee, $attendance);

        // daily: SNW worked => extra 30% premium => 600 * 0.30 = 180
        $this->assertEquals(180.00, $holidayPay);
    }

    public function test_daily_regular_holiday_restday_worked(): void
    {
        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'regular_holidays_restday_worked' => 1,
        ]);

        $holidayPay = $this->payrollService->computeHolidayPay($employee, $attendance);

        // daily: RH on rest day => 260% of daily rate => 600 * 2.60 = 1560
        $this->assertEquals(1560.00, $holidayPay);
    }

    // ── Holiday Pay (Monthly) ──

    public function test_monthly_regular_holiday_worked(): void
    {
        $employee = Employee::factory()->monthly(15000.00)->create([
            'monthly_divisor' => 313,
        ]);
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'regular_holidays_worked' => 1,
        ]);

        $holidayPay = $this->payrollService->computeHolidayPay($employee, $attendance);

        $dailyRate = round(15000 * 12 / 313, 2);
        // monthly: RH worked => extra 100% => dailyRate * 1.00
        $this->assertEquals(round($dailyRate * 1.00, 2), $holidayPay);
    }

    // ── SSS Computation ──

    public function test_sss_computation_with_matching_bracket(): void
    {
        $this->seedSssTable();

        $result = $this->payrollService->computeSSS(15000);

        $this->assertEquals(675.00, $result['employee']);
        $this->assertEquals(1425.00, $result['employer']);
        $this->assertEquals(10.00, $result['ec']);
    }

    public function test_sss_falls_to_lowest_bracket_when_no_match(): void
    {
        // If no SSS table rows exist, returns zeros
        $result = $this->payrollService->computeSSS(15000);
        $this->assertEquals(0, $result['employee']);
    }

    // ── PhilHealth Computation ──

    public function test_philhealth_computation(): void
    {
        $result = $this->payrollService->computePhilHealth(15000);

        // 15000 * 0.05 = 750; employee = 375, employer = 375
        $this->assertEquals(375.00, $result['employee']);
        $this->assertEquals(375.00, $result['employer']);
    }

    public function test_philhealth_minimum_premium(): void
    {
        // Very low salary: 2000 * 0.05 = 100, but min is 500
        $result = $this->payrollService->computePhilHealth(2000);

        $this->assertEquals(250.00, $result['employee']);
        $this->assertEquals(250.00, $result['employer']);
    }

    public function test_philhealth_maximum_premium(): void
    {
        // Very high salary: 500000 * 0.05 = 25000, but max is 10000
        $result = $this->payrollService->computePhilHealth(500000);

        $this->assertEquals(5000.00, $result['employee']);
        $this->assertEquals(5000.00, $result['employer']);
    }

    // ── PagIBIG Computation ──

    public function test_pagibig_below_1500_uses_1_percent(): void
    {
        $result = $this->payrollService->computePagIBIG(1000);

        // 1000 * 0.01 = 10 (employee); 1000 * 0.02 = 20 (employer)
        $this->assertEquals(10.00, $result['employee']);
        $this->assertEquals(20.00, $result['employer']);
    }

    public function test_pagibig_above_1500_uses_2_percent_capped_at_200(): void
    {
        $result = $this->payrollService->computePagIBIG(15000);

        // 15000 * 0.02 = 300, capped at 200 (employee); employer = 300
        $this->assertEquals(200.00, $result['employee']);
        $this->assertEquals(300.00, $result['employer']);
    }

    // ── Withholding Tax ──

    public function test_withholding_tax_zero_for_below_threshold(): void
    {
        $this->seedBirTable();

        $tax = $this->payrollService->computeWithholdingTax(8000, 'S');
        $this->assertEquals(0.00, $tax);
    }

    public function test_withholding_tax_computation_above_threshold(): void
    {
        $this->seedBirTable();

        // 12000 falls in bracket: 10417.01 - 16666
        // tax = 0 + (12000 - 10417) * 0.15 = 237.45
        $tax = $this->payrollService->computeWithholdingTax(12000, 'S');
        $this->assertEquals(237.45, $tax);
    }

    public function test_withholding_tax_zero_for_negative_income(): void
    {
        $this->seedBirTable();

        $tax = $this->payrollService->computeWithholdingTax(-500, 'S');
        $this->assertEquals(0.00, $tax);
    }

    // ── Full computeForEmployee ──

    public function test_compute_for_daily_employee(): void
    {
        $this->seedSssTable();
        $this->seedBirTable();

        $employee = Employee::factory()->daily(600.00)->create(['tax_status' => 'S']);
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, [
            'days_present' => 13,
            'overtime_hours' => 2,
            'late_deduction' => 50.00,
        ]);

        $record = $this->payrollService->computeForEmployee($employee, $period, $attendance, $this->operator);

        $this->assertInstanceOf(PayrollRecord::class, $record);
        $this->assertEquals(7800.00, (float) $record->basic_pay); // 600 * 13
        $this->assertEquals(187.50, (float) $record->overtime_pay); // (600/8) * 1.25 * 2
        $this->assertEquals(0.00, (float) $record->holiday_pay);

        // Fixed employee shares overridden
        $this->assertEquals(225.00, (float) $record->sss_employee);
        $this->assertEquals(125.00, (float) $record->philhealth_employee);
        $this->assertEquals(100.00, (float) $record->pagibig_employee);

        $grossPay = 7800 + 187.50 + 0 + 0 - 50; // 7937.50
        $this->assertEquals(round($grossPay, 2), (float) $record->gross_pay);
        $this->assertEquals('draft', $record->status);
    }

    // ── Period Workflow ──

    public function test_lock_period_changes_status(): void
    {
        $period = $this->createPeriod(['status' => 'draft']);

        $locked = $this->payrollService->lockPeriod($period, $this->operator);

        $this->assertEquals('locked', $locked->status);
        $this->assertEquals($this->operator->id, $locked->approved_by);
        $this->assertNotNull($locked->approved_at);
    }

    public function test_lock_period_rejects_non_draft(): void
    {
        $period = $this->createPeriod(['status' => 'locked']);

        $this->expectException(\RuntimeException::class);
        $this->payrollService->lockPeriod($period, $this->operator);
    }

    public function test_mark_period_paid(): void
    {
        $period = $this->createPeriod(['status' => 'locked']);

        $paid = $this->payrollService->markPeriodPaid($period, $this->operator);

        $this->assertEquals('paid', $paid->status);
        $this->assertNotNull($paid->paid_at);
    }

    public function test_mark_paid_rejects_non_locked(): void
    {
        $period = $this->createPeriod(['status' => 'draft']);

        $this->expectException(\RuntimeException::class);
        $this->payrollService->markPeriodPaid($period, $this->operator);
    }

    public function test_lock_period_confirms_draft_records(): void
    {
        $employee = Employee::factory()->create();
        $period = $this->createPeriod(['status' => 'draft']);

        PayrollRecord::create([
            'payroll_period_id' => $period->id,
            'employee_id' => $employee->id,
            'basic_pay' => 7800,
            'overtime_pay' => 0,
            'holiday_pay' => 0,
            'allowances' => 0,
            'gross_pay' => 7800,
            'sss_employee' => 225,
            'philhealth_employee' => 125,
            'pagibig_employee' => 100,
            'bir_withholding_tax' => 0,
            'sss_employer' => 0,
            'sss_ec' => 0,
            'philhealth_employer' => 0,
            'pagibig_employer' => 0,
            'late_deduction' => 0,
            'other_deductions' => 0,
            'cash_advance' => 0,
            'loan_deduction' => 0,
            'total_deductions' => 450,
            'net_pay' => 7350,
            'pay_type' => 'daily',
            'basic_salary_snapshot' => 600,
            'days_present' => 13,
            'days_absent' => 0,
            'overtime_hours' => 0,
            'status' => 'draft',
            'computed_by' => $this->operator->id,
        ]);

        $this->payrollService->lockPeriod($period, $this->operator);

        $record = PayrollRecord::where('payroll_period_id', $period->id)->first();
        $this->assertEquals('confirmed', $record->status);
    }

    // ── Recurring Deductions ──

    public function test_recurring_cash_advance_deducted(): void
    {
        $this->seedSssTable();
        $this->seedBirTable();

        $employee = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();
        $attendance = $this->createAttendance($employee, $period, ['days_present' => 13]);

        EmployeeRecurringDeduction::create([
            'employee_id' => $employee->id,
            'type' => 'cash_advance',
            'description' => 'Cash advance from Dec',
            'total_amount' => 5000,
            'amount_per_period' => 500,
            'amount_remaining' => 5000,
            'start_date' => '2025-01-01',
            'is_active' => true,
        ]);

        $record = $this->payrollService->computeForEmployee($employee, $period, $attendance, $this->operator);

        $this->assertEquals(500.00, (float) $record->cash_advance);

        // Remaining should be reduced
        $deduction = EmployeeRecurringDeduction::where('employee_id', $employee->id)->first();
        $this->assertEquals(4500.00, (float) $deduction->amount_remaining);
    }

    // ── 13th Month Pay ──

    public function test_13th_month_pay_calculation(): void
    {
        $employee = Employee::factory()->create();
        $period1 = $this->createPeriod(['name' => 'Jan', 'period_start' => '2025-01-01', 'period_end' => '2025-01-15']);
        $period2 = $this->createPeriod(['name' => 'Feb', 'period_start' => '2025-02-01', 'period_end' => '2025-02-15']);

        PayrollRecord::create([
            'payroll_period_id' => $period1->id,
            'employee_id' => $employee->id,
            'basic_pay' => 7800,
            'overtime_pay' => 0, 'holiday_pay' => 0, 'allowances' => 0,
            'gross_pay' => 7800, 'sss_employee' => 0, 'philhealth_employee' => 0,
            'pagibig_employee' => 0, 'bir_withholding_tax' => 0, 'sss_employer' => 0,
            'sss_ec' => 0, 'philhealth_employer' => 0, 'pagibig_employer' => 0,
            'late_deduction' => 0, 'other_deductions' => 0, 'cash_advance' => 0,
            'loan_deduction' => 0, 'total_deductions' => 0, 'net_pay' => 7800,
            'pay_type' => 'daily', 'basic_salary_snapshot' => 600,
            'days_present' => 13, 'days_absent' => 0, 'overtime_hours' => 0,
            'status' => 'confirmed', 'computed_by' => $this->operator->id,
        ]);

        PayrollRecord::create([
            'payroll_period_id' => $period2->id,
            'employee_id' => $employee->id,
            'basic_pay' => 6000,
            'overtime_pay' => 0, 'holiday_pay' => 0, 'allowances' => 0,
            'gross_pay' => 6000, 'sss_employee' => 0, 'philhealth_employee' => 0,
            'pagibig_employee' => 0, 'bir_withholding_tax' => 0, 'sss_employer' => 0,
            'sss_ec' => 0, 'philhealth_employer' => 0, 'pagibig_employer' => 0,
            'late_deduction' => 0, 'other_deductions' => 0, 'cash_advance' => 0,
            'loan_deduction' => 0, 'total_deductions' => 0, 'net_pay' => 6000,
            'pay_type' => 'daily', 'basic_salary_snapshot' => 600,
            'days_present' => 10, 'days_absent' => 0, 'overtime_hours' => 0,
            'status' => 'paid', 'computed_by' => $this->operator->id,
        ]);

        $amount = $this->payrollService->compute13thMonthPay($employee, 2025);

        // (7800 + 6000) / 12 = 1150
        $this->assertEquals(1150.00, $amount);
    }

    // ── Compute Payroll (Batch) ──

    public function test_compute_payroll_only_processes_employees_with_attendance(): void
    {
        $this->seedSssTable();
        $this->seedBirTable();

        $employee1 = Employee::factory()->daily(600.00)->create();
        $employee2 = Employee::factory()->daily(600.00)->create();
        $period = $this->createPeriod();

        // Only employee1 has attendance
        $this->createAttendance($employee1, $period, ['days_present' => 13]);

        $results = $this->payrollService->computePayroll($period, $this->operator);

        $this->assertCount(1, $results);
        $this->assertEquals($employee1->id, $results->first()->employee_id);
    }

    public function test_compute_payroll_rejects_non_draft_period(): void
    {
        $period = $this->createPeriod(['status' => 'locked']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Can only compute payroll for draft periods.');

        $this->payrollService->computePayroll($period, $this->operator);
    }

    // ── Create Period ──

    public function test_create_period(): void
    {
        $period = $this->payrollService->createPeriod([
            'name' => 'Test Period',
            'period_start' => '2025-03-01',
            'period_end' => '2025-03-15',
        ], $this->operator);

        $this->assertInstanceOf(PayrollPeriod::class, $period);
        $this->assertEquals('draft', $period->status);
        $this->assertEquals($this->operator->id, $period->created_by);
    }
}
