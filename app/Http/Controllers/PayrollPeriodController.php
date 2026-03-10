<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePayrollPeriodRequest;
use App\Models\PayrollPeriod;
use App\Services\PayrollService;
use Illuminate\Database\UniqueConstraintViolationException;
use Inertia\Inertia;

class PayrollPeriodController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService
    ) {}

    public function index()
    {
        $periods = PayrollPeriod::with('createdBy')
            ->withCount('payrollRecords')
            ->orderByDesc('period_start')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Payroll/Periods/Index', [
            'periods' => $periods,
        ]);
    }

    public function create()
    {
        return Inertia::render('Payroll/Periods/Create');
    }

    public function store(StorePayrollPeriodRequest $request)
    {
        try {
            $this->payrollService->createPeriod($request->validated(), $request->user());
        } catch (UniqueConstraintViolationException) {
            return back()->withErrors([
                'period_start' => 'A payroll period with these exact start and end dates already exists.',
            ])->withInput();
        }

        return redirect()->route('payroll-periods.index')
            ->with('success', 'Payroll period created.');
    }

    public function show(PayrollPeriod $payrollPeriod)
    {
        $payrollPeriod->load([
            'payrollRecords.employee',
            'payrollRecords.payslip',
            'createdBy',
            'approvedBy',
        ]);

        return Inertia::render('Payroll/Periods/Show', [
            'period' => $payrollPeriod,
        ]);
    }

    public function destroy(PayrollPeriod $payrollPeriod)
    {
        if ($payrollPeriod->status !== 'draft') {
            return back()->with('error', 'Only draft periods can be deleted.');
        }

        $payrollPeriod->payrollRecords()->delete();
        $payrollPeriod->attendanceRecords()->delete();
        $payrollPeriod->delete();

        return redirect()->route('payroll-periods.index')
            ->with('success', 'Payroll period deleted.');
    }

    public function compute(PayrollPeriod $payrollPeriod)
    {
        try {
            $records = $this->payrollService->computePayroll($payrollPeriod, request()->user());

            return back()->with('success', "Payroll computed for {$records->count()} employees.");
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function lock(PayrollPeriod $payrollPeriod)
    {
        try {
            $this->payrollService->lockPeriod($payrollPeriod, request()->user());

            return back()->with('success', 'Payroll period locked.');
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function markPaid(PayrollPeriod $payrollPeriod)
    {
        try {
            $this->payrollService->markPeriodPaid($payrollPeriod, request()->user());

            return back()->with('success', 'Payroll period marked as paid.');
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
