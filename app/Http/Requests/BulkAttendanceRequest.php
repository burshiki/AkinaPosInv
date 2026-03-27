<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'attendance'                                       => ['required', 'array', 'min:1'],
            'attendance.*.employee_id'                         => ['required', 'exists:employees,id'],
            'attendance.*.days_present'                        => ['required', 'numeric', 'min:0', 'max:31'],
            'attendance.*.days_absent'                         => ['required', 'numeric', 'min:0', 'max:31'],
            'attendance.*.days_late'                           => ['nullable', 'integer', 'min:0'],
            'attendance.*.overtime_hours'                      => ['nullable', 'numeric', 'min:0'],
            'attendance.*.hours_late'                          => ['nullable', 'numeric', 'min:0'],
            'attendance.*.regular_holidays_not_worked'         => ['nullable', 'integer', 'min:0'],
            'attendance.*.regular_holidays_worked'             => ['nullable', 'integer', 'min:0'],
            'attendance.*.special_holidays_worked'             => ['nullable', 'integer', 'min:0'],
            'attendance.*.regular_holidays_restday_worked'     => ['nullable', 'integer', 'min:0'],
            'attendance.*.special_holidays_restday_worked'     => ['nullable', 'integer', 'min:0'],
            'attendance.*.notes'                               => ['nullable', 'string', 'max:500'],
        ];
    }
}
