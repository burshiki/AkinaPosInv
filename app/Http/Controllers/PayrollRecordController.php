<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePayrollRecordRequest;
use App\Models\BankAccount;
use App\Models\CashDrawerExpense;
use App\Models\CashDrawerSession;
use App\Models\PayrollRecord;
use App\Services\BankingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PayrollRecordController extends Controller
{
    public function show(PayrollRecord $payrollRecord)
    {
        $payrollRecord->load(['employee', 'payrollPeriod', 'payslip', 'computedBy']);

        $bankAccounts     = BankAccount::where('is_active', true)->get(['id', 'name', 'bank_name', 'balance', 'account_number']);
        $openDrawerSession = CashDrawerSession::where('status', 'open')->latest()->first();

        return Inertia::render('Payroll/Records/Show', [
            'record'            => $payrollRecord,
            'bankAccounts'      => $bankAccounts,
            'openDrawerSession' => $openDrawerSession,
        ]);
    }

    public function disburse(Request $request, PayrollRecord $payrollRecord)
    {
        if ($payrollRecord->status === 'paid') {
            return back()->with('error', 'This payroll record has already been paid.');
        }

        $validated = $request->validate([
            'disbursement_source' => ['required', 'in:cash_drawer,bank_account'],
            'disbursement_id'     => ['required', 'integer', 'min:1'],
            'disbursement_notes'  => ['nullable', 'string', 'max:255'],
        ]);

        $payrollRecord->load(['employee', 'payrollPeriod']);
        $empName    = optional($payrollRecord->employee)->full_name ?? 'Employee';
        $periodName = optional($payrollRecord->payrollPeriod)->name ?? 'Payroll';
        $description = "Payroll disbursement: {$empName} – {$periodName}";

        DB::transaction(function () use ($validated, $payrollRecord, $description, $request) {
            if ($validated['disbursement_source'] === 'cash_drawer') {
                $session = CashDrawerSession::findOrFail($validated['disbursement_id']);
                if ($session->status !== 'open') {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'disbursement_id' => 'The selected cash drawer session is not open.',
                    ]);
                }
                CashDrawerExpense::create([
                    'cash_drawer_session_id' => $session->id,
                    'performed_by'           => $request->user()->id,
                    'category'               => 'payroll',
                    'amount'                 => $payrollRecord->net_pay,
                    'description'            => $description,
                ]);
            } else {
                $bankAccount = BankAccount::findOrFail($validated['disbursement_id']);
                app(BankingService::class)->recordOutflow(
                    $bankAccount,
                    (float) $payrollRecord->net_pay,
                    $description,
                    'payroll',
                    PayrollRecord::class,
                    $payrollRecord->id,
                    $request->user()->id
                );

                // Also record in the current open cash drawer session as a non-cash expense (informational)
                $openSession = CashDrawerSession::where('status', 'open')->latest()->first();
                if ($openSession) {
                    CashDrawerExpense::create([
                        'cash_drawer_session_id' => $openSession->id,
                        'performed_by'           => $request->user()->id,
                        'category'               => 'payroll',
                        'payment_method'         => $bankAccount->bank_name ?? $bankAccount->name,
                        'amount'                 => $payrollRecord->net_pay,
                        'description'            => $description,
                    ]);
                }
            }

            $payrollRecord->update([
                'status'              => 'paid',
                'paid_at'             => now(),
                'disbursement_source' => $validated['disbursement_source'],
                'disbursement_id'     => $validated['disbursement_id'],
                'disbursement_notes'  => $validated['disbursement_notes'] ?? null,
            ]);
        });

        return back()->with('success', 'Payroll disbursed successfully.');
    }

    public function update(UpdatePayrollRecordRequest $request, PayrollRecord $payrollRecord)
    {
        if ($payrollRecord->status !== 'draft') {
            abort(403, 'Only draft records can be edited.');
        }

        $v = $request->validated();

        $allowances      = (float) ($v['allowances']          ?? $payrollRecord->allowances);
        $sssEmp          = (float) ($v['sss_employee']         ?? $payrollRecord->sss_employee);
        $philEmp         = (float) ($v['philhealth_employee']  ?? $payrollRecord->philhealth_employee);
        $pagibigEmp      = (float) ($v['pagibig_employee']     ?? $payrollRecord->pagibig_employee);
        $bir             = (float) ($v['bir_withholding_tax']  ?? $payrollRecord->bir_withholding_tax);
        $sssEr           = (float) ($v['sss_employer']         ?? $payrollRecord->sss_employer);
        $sssEc           = (float) ($v['sss_ec']               ?? $payrollRecord->sss_ec);
        $philEr          = (float) ($v['philhealth_employer']  ?? $payrollRecord->philhealth_employer);
        $pagibigEr       = (float) ($v['pagibig_employer']     ?? $payrollRecord->pagibig_employer);
        $other           = (float) ($v['other_deductions']     ?? 0);
        $cashAdvance     = (float) ($v['cash_advance']          ?? $payrollRecord->cash_advance);
        $loanDeduction   = (float) ($v['loan_deduction']        ?? $payrollRecord->loan_deduction);
        $lateDeduction   = (float) $payrollRecord->late_deduction;

        $grossPay = (float) $payrollRecord->basic_pay
            + (float) $payrollRecord->overtime_pay
            + (float) $payrollRecord->holiday_pay
            + $allowances
            - $lateDeduction;

        $totalDeductions = $sssEmp + $philEmp + $pagibigEmp + $bir + $lateDeduction + $other + $cashAdvance + $loanDeduction;
        $netPay = $grossPay - $totalDeductions;

        $payrollRecord->update([
            'allowances'             => round($allowances, 2),
            'gross_pay'              => round($grossPay, 2),
            'sss_employee'           => round($sssEmp, 2),
            'philhealth_employee'    => round($philEmp, 2),
            'pagibig_employee'       => round($pagibigEmp, 2),
            'bir_withholding_tax'    => round($bir, 2),
            'sss_employer'           => round($sssEr, 2),
            'sss_ec'                 => round($sssEc, 2),
            'philhealth_employer'    => round($philEr, 2),
            'pagibig_employer'       => round($pagibigEr, 2),
            'other_deductions'       => round($other, 2),
            'cash_advance'           => round($cashAdvance, 2),
            'loan_deduction'         => round($loanDeduction, 2),
            'other_deductions_notes' => $v['other_deductions_notes'] ?? null,
            'total_deductions'       => round($totalDeductions, 2),
            'net_pay'                => round($netPay, 2),
        ]);

        return back()->with('success', 'Payroll record updated.');
    }
}
