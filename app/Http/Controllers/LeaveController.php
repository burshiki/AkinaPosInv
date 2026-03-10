<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeaveController extends Controller
{
    public function index()
    {
        $year = (int) request('year', now()->year);

        $requests = LeaveRequest::with(['employee', 'leaveType', 'approver'])
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(request('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        // Build year-end SIL conversion summary for admins
        $silType = LeaveType::where('is_cash_convertible', true)->first();
        $silBalances = $silType
            ? LeaveBalance::with('employee')
                ->where('leave_type_id', $silType->id)
                ->where('year', $year)
                ->get()
                ->filter(fn ($b) => ($b->remaining_days) > 0)
                ->map(fn ($b) => [
                    'employee_id'        => $b->employee_id,
                    'employee_name'      => $b->employee->full_name,
                    'total_days'         => (float) $b->total_days,
                    'used_days'          => (float) $b->used_days,
                    'cash_converted_days'=> (float) $b->cash_converted_days,
                    'unconverted_days'   => (float) $b->remaining_days,
                    'daily_rate'         => $b->employee->daily_rate,
                    'cash_equivalent'    => round($b->remaining_days * $b->employee->daily_rate, 2),
                ])
                ->values()
            : collect([]);

        $leaveBalances = LeaveBalance::with(['employee', 'leaveType'])
            ->where('year', $year)
            ->when(request('employee_id'), fn ($q, $id) => $q->where('employee_id', $id))
            ->get()
            ->map(fn ($b) => [
                'employee_id'        => $b->employee_id,
                'employee_name'      => $b->employee->full_name,
                'leave_type_name'    => $b->leaveType->name,
                'is_paid'            => $b->leaveType->is_paid,
                'total_days'         => (float) $b->total_days,
                'used_days'          => (float) $b->used_days,
                'cash_converted_days'=> (float) $b->cash_converted_days,
                'remaining_days'     => (float) $b->remaining_days,
            ])
            ->sortBy([['employee_name', 'asc'], ['leave_type_name', 'asc']])
            ->values();

        return Inertia::render('Payroll/Leave/Index', [
            'requests'      => $requests,
            'employees'     => Employee::where('is_active', true)->orderBy('first_name')->get(['id', 'first_name', 'last_name', 'employee_number', 'hired_at']),
            'leaveTypes'    => LeaveType::where('is_active', true)->get(),
            'filters'       => request()->only(['status', 'employee_id']),
            'silBalances'   => $silBalances,
            'silYear'       => $year,
            'leaveBalances' => $leaveBalances,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id'   => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date'    => ['required', 'date'],
            'end_date'      => ['required', 'date', 'after_or_equal:start_date'],
            'days_count'    => ['required', 'numeric', 'min:0.5'],
            'reason'        => ['nullable', 'string', 'max:1000'],
        ]);

        $leaveType = LeaveType::findOrFail($validated['leave_type_id']);
        $employee  = Employee::findOrFail($validated['employee_id']);

        // Enforce minimum service months (e.g., SIL requires 12 months — Labor Code Art. 95)
        if ($leaveType->min_service_months !== null) {
            if (! $employee->hired_at) {
                return back()->with('error', "Cannot file {$leaveType->name}: employee hire date is not set.");
            }

            $monthsServed = (int) $employee->hired_at->diffInMonths(Carbon::parse($validated['start_date']));

            if ($monthsServed < $leaveType->min_service_months) {
                $needed = $leaveType->min_service_months - $monthsServed;
                return back()->with('error',
                    "Employee is not yet eligible for {$leaveType->name}. " .
                    "Requires {$leaveType->min_service_months} months of service; " .
                    "employee has {$monthsServed} month(s) — {$needed} more month(s) needed."
                );
            }
        }

        // Check balance
        $year    = date('Y', strtotime($validated['start_date']));
        $balance = LeaveBalance::firstOrCreate(
            ['employee_id' => $validated['employee_id'], 'leave_type_id' => $validated['leave_type_id'], 'year' => $year],
            ['total_days' => $leaveType->default_days_per_year ?? 0, 'used_days' => 0, 'cash_converted_days' => 0]
        );

        if ($balance->remaining_days < $validated['days_count']) {
            return back()->with('error', "Insufficient leave balance. Available: {$balance->remaining_days} day(s).");
        }

        LeaveRequest::create(array_merge($validated, ['status' => 'pending']));

        return back()->with('success', 'Leave request submitted.');
    }

    public function approve(LeaveRequest $leaveRequest)
    {
        if ($leaveRequest->status !== 'pending') {
            return back()->with('error', 'Only pending requests can be approved.');
        }

        $year    = $leaveRequest->start_date->year;
        $balance = LeaveBalance::firstOrCreate(
            ['employee_id' => $leaveRequest->employee_id, 'leave_type_id' => $leaveRequest->leave_type_id, 'year' => $year],
            ['total_days' => $leaveRequest->leaveType->default_days_per_year ?? 0, 'used_days' => 0, 'cash_converted_days' => 0]
        );

        if ($balance->remaining_days < $leaveRequest->days_count) {
            return back()->with('error', 'Insufficient leave balance.');
        }

        $balance->increment('used_days', $leaveRequest->days_count);
        $leaveRequest->update([
            'status'      => 'approved',
            'approved_by' => auth()->id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Leave request approved.');
    }

    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        if ($leaveRequest->status !== 'pending') {
            return back()->with('error', 'Only pending requests can be rejected.');
        }

        $leaveRequest->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->input('rejection_reason'),
            'approved_by'      => auth()->id(),
            'approved_at'      => now(),
        ]);

        return back()->with('success', 'Leave request rejected.');
    }

    /**
     * Year-end SIL cash conversion — Labor Code Art. 95.
     * All unused Service Incentive Leave days must be converted to their cash equivalent.
     */
    public function convertSilToCash(Request $request)
    {
        $request->validate(['year' => ['required', 'integer', 'min:2000', 'max:2100']]);
        $year = (int) $request->input('year');

        $silType = LeaveType::where('is_cash_convertible', true)->first();
        if (! $silType) {
            return back()->with('error', 'No cash-convertible leave type is configured.');
        }

        $balances = LeaveBalance::with('employee')
            ->where('leave_type_id', $silType->id)
            ->where('year', $year)
            ->get()
            ->filter(fn ($b) => $b->remaining_days > 0);

        if ($balances->isEmpty()) {
            return back()->with('info', "No unconverted SIL days found for {$year}.");
        }

        $count = 0;
        foreach ($balances as $balance) {
            $unconverted = $balance->remaining_days;
            $balance->increment('cash_converted_days', $unconverted);
            $count++;
        }

        return back()->with('success', "{$count} employee(s) SIL balance converted to cash for {$year}.");
    }
}
