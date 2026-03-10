<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\Employee;
use App\Models\User;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    public function index()
    {
        $employees = Employee::query()
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_number', 'like', "%{$search}%");
                });
            })
            ->when(request('pay_type'), fn ($q, $type) => $q->where('pay_type', $type))
            ->when(request('department'), fn ($q, $dept) => $q->where('department', $dept))
            ->when(request('status') !== null && request('status') !== 'all', function ($q) {
                $q->where('is_active', request('status') === 'active');
            })
            ->orderBy('last_name')
            ->paginate(20)
            ->withQueryString();

        $departments = Employee::whereNotNull('department')
            ->distinct()
            ->pluck('department');

        $users = User::whereDoesntHave('employee')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Payroll/Employees/Index', [
            'employees' => $employees,
            'departments' => $departments,
            'filters' => request()->only(['search', 'pay_type', 'department', 'status']),
            'users' => $users,
        ]);
    }

    public function create()
    {
        $users = User::whereDoesntHave('employee')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Payroll/Employees/Create', [
            'users' => $users,
        ]);
    }

    public function store(StoreEmployeeRequest $request)
    {
        Employee::create($request->validated());

        return redirect()->route('employees.index')
            ->with('success', 'Employee created successfully.');
    }

    public function show(Employee $employee)
    {
        $employee->load(['user', 'payrollRecords.payrollPeriod', 'payslips.payrollPeriod']);

        $users = User::where(function ($q) use ($employee) {
            $q->whereDoesntHave('employee')
              ->orWhere('id', $employee->user_id);
        })->select('id', 'name', 'email')->get();

        return Inertia::render('Payroll/Employees/Show', [
            'employee' => $employee,
            'users'    => $users,
        ]);
    }

    public function edit(Employee $employee)
    {
        $users = User::where(function ($q) use ($employee) {
            $q->whereDoesntHave('employee')
              ->orWhere('id', $employee->user_id);
        })->select('id', 'name', 'email')->get();

        return Inertia::render('Payroll/Employees/Edit', [
            'employee' => $employee,
            'users' => $users,
        ]);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $employee->update($request->validated());

        return redirect()->route('employees.index')
            ->with('success', 'Employee updated successfully.');
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return redirect()->route('employees.index')
            ->with('success', 'Employee deleted.');
    }
}
