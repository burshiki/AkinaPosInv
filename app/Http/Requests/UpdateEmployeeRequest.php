<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id'            => ['nullable', 'exists:users,id'],
            'employee_number'    => ['required', 'string', 'max:30', Rule::unique('employees')->ignore($this->employee)],
            'first_name'         => ['required', 'string', 'max:100'],
            'last_name'          => ['required', 'string', 'max:100'],
            'middle_name'        => ['nullable', 'string', 'max:100'],
            'position'           => ['nullable', 'string', 'max:100'],
            'department'         => ['nullable', 'string', 'max:100'],
            'pay_type'           => ['required', 'in:monthly,daily'],
            'basic_salary'       => ['required', 'numeric', 'min:0'],
            'standard_work_days' => ['nullable', 'integer', 'min:1', 'max:31'],
            'monthly_divisor'    => ['nullable', 'integer', 'min:1', 'max:365'],
            'hired_at'           => ['required', 'date'],
            'separated_at'       => ['nullable', 'date', 'after_or_equal:hired_at'],
            'sss_number'         => ['nullable', 'string', 'max:30'],
            'philhealth_number'  => ['nullable', 'string', 'max:30'],
            'pagibig_number'     => ['nullable', 'string', 'max:30'],
            'tin'                => ['nullable', 'string', 'max:30'],
            'tax_status'         => ['nullable', 'string', 'max:10'],
            'phone'              => ['nullable', 'string', 'max:50'],
            'address'            => ['nullable', 'string'],
            'is_active'          => ['boolean'],
        ];
    }
}
