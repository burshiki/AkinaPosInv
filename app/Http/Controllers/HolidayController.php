<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class HolidayController extends Controller
{
    public function index()
    {
        $year = (int) request('year', now()->year);

        $holidays = Holiday::whereYear('date', $year)
            ->orderBy('date')
            ->get();

        return Inertia::render('Payroll/Holidays/Index', [
            'holidays' => $holidays,
            'year'     => $year,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => [
                'required',
                'date',
                Rule::unique('holidays', 'date'),
            ],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['regular', 'special_non_working', 'special_working'])],
        ]);

        $validated['year'] = (int) date('Y', strtotime($validated['date']));

        Holiday::create($validated);

        return back()->with('success', 'Holiday added.');
    }

    public function update(Request $request, Holiday $holiday)
    {
        $validated = $request->validate([
            'date' => [
                'required',
                'date',
                Rule::unique('holidays', 'date')->ignore($holiday->id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['regular', 'special_non_working', 'special_working'])],
        ]);

        $validated['year'] = (int) date('Y', strtotime($validated['date']));

        $holiday->update($validated);

        return back()->with('success', 'Holiday updated.');
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();

        return back()->with('success', 'Holiday deleted.');
    }
}
