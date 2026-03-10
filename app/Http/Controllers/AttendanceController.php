<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkAttendanceRequest;
use App\Models\AttendanceRecord;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\PayrollPeriod;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    public function edit(PayrollPeriod $payrollPeriod)
    {
        if ($payrollPeriod->status !== 'draft') {
            return back()->with('error', 'Attendance can only be edited for draft periods.');
        }

        $employees = Employee::where('is_active', true)->orderBy('last_name')->get();

        $existingAttendance = AttendanceRecord::where('payroll_period_id', $payrollPeriod->id)
            ->get()
            ->keyBy('employee_id');

        $holidays = Holiday::getForPeriod($payrollPeriod->period_start, $payrollPeriod->period_end);

        return Inertia::render('Payroll/Attendance/Edit', [
            'period' => $payrollPeriod,
            'employees' => $employees,
            'existingAttendance' => $existingAttendance,
            'holidays' => $holidays,
        ]);
    }

    public function bulkStore(BulkAttendanceRequest $request, PayrollPeriod $payrollPeriod)
    {
        if ($payrollPeriod->status !== 'draft') {
            return back()->with('error', 'Attendance can only be recorded for draft periods.');
        }

        foreach ($request->attendance as $entry) {
            AttendanceRecord::updateOrCreate(
                [
                    'employee_id' => $entry['employee_id'],
                    'payroll_period_id' => $payrollPeriod->id,
                ],
                [
                    'days_present' => $entry['days_present'],
                    'days_absent' => $entry['days_absent'],
                    'days_late' => $entry['days_late'] ?? 0,
                    'overtime_hours' => $entry['overtime_hours'] ?? 0,
                    'late_deduction' => $entry['late_deduction'] ?? 0,
                    'regular_holidays_not_worked' => $entry['regular_holidays_not_worked'] ?? 0,
                    'regular_holidays_worked' => $entry['regular_holidays_worked'] ?? 0,
                    'special_holidays_worked' => $entry['special_holidays_worked'] ?? 0,
                    'regular_holidays_restday_worked' => $entry['regular_holidays_restday_worked'] ?? 0,
                    'special_holidays_restday_worked' => $entry['special_holidays_restday_worked'] ?? 0,
                    'notes' => $entry['notes'] ?? null,
                    'recorded_by' => $request->user()->id,
                ]
            );
        }

        return redirect()->route('payroll-periods.show', $payrollPeriod)
            ->with('success', 'Attendance saved successfully.');
    }
}
