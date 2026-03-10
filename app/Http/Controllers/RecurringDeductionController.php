<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeRecurringDeduction;
use Illuminate\Http\Request;

class RecurringDeductionController extends Controller
{
    public function store(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'type' => ['required', 'in:cash_advance,loan,other'],
            'description' => ['required', 'string', 'max:255'],
            'total_amount' => ['required', 'numeric', 'min:0.01'],
            'amount_per_period' => ['required', 'numeric', 'min:0.01'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        EmployeeRecurringDeduction::create(array_merge($validated, [
            'employee_id' => $employee->id,
            'amount_remaining' => $validated['total_amount'],
            'is_active' => true,
        ]));

        return back()->with('success', 'Recurring deduction created.');
    }

    public function update(Request $request, EmployeeRecurringDeduction $deduction)
    {
        $validated = $request->validate([
            'amount_per_period' => ['required', 'numeric', 'min:0.01'],
            'is_active' => ['boolean'],
        ]);

        $deduction->update($validated);

        return back()->with('success', 'Deduction updated.');
    }

    public function destroy(EmployeeRecurringDeduction $deduction)
    {
        $deduction->delete();
        return back()->with('success', 'Deduction deleted.');
    }
}
