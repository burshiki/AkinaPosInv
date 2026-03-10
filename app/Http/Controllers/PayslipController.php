<?php

namespace App\Http\Controllers;

use App\Models\Payslip;
use App\Models\PayrollRecord;
use App\Services\PayrollService;
use Inertia\Inertia;

class PayslipController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService
    ) {}

    public function generate(PayrollRecord $payrollRecord)
    {
        $payslip = $this->payrollService->generatePayslip($payrollRecord, request()->user());

        return redirect()->route('payslips.show', $payslip)
            ->with('success', 'Payslip generated.');
    }

    public function show(Payslip $payslip)
    {
        $payslip->load([
            'payrollRecord.employee',
            'payrollRecord.payrollPeriod',
            'generatedBy',
        ]);

        return Inertia::render('Payroll/Payslips/Show', [
            'payslip' => $payslip,
        ]);
    }

    public function print(Payslip $payslip)
    {
        $payslip->load([
            'payrollRecord.employee',
            'payrollRecord.payrollPeriod',
        ]);

        return Inertia::render('Payroll/Payslips/Print', [
            'payslip' => $payslip,
        ]);
    }
}
