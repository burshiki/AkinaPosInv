<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePayrollRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'allowances'             => ['nullable', 'numeric', 'min:0'],
            'sss_employee'           => ['nullable', 'numeric', 'min:0'],
            'philhealth_employee'    => ['nullable', 'numeric', 'min:0'],
            'pagibig_employee'       => ['nullable', 'numeric', 'min:0'],
            'bir_withholding_tax'    => ['nullable', 'numeric', 'min:0'],
            'sss_employer'           => ['nullable', 'numeric', 'min:0'],
            'sss_ec'                 => ['nullable', 'numeric', 'min:0'],
            'philhealth_employer'    => ['nullable', 'numeric', 'min:0'],
            'pagibig_employer'       => ['nullable', 'numeric', 'min:0'],
            'cash_advance'           => ['nullable', 'numeric', 'min:0'],
            'loan_deduction'         => ['nullable', 'numeric', 'min:0'],
            'other_deductions'       => ['nullable', 'numeric', 'min:0'],
            'other_deductions_notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
