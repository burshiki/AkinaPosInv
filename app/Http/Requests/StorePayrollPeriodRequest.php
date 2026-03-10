<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePayrollPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['required', 'string', 'max:100'],
            'period_start' => [
                'required',
                'date',
                Rule::unique('payroll_periods', 'period_start')
                    ->where('period_end', $this->input('period_end')),
            ],
            'period_end'   => ['required', 'date', 'after_or_equal:period_start'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'period_start.unique' => 'A payroll period with these exact start and end dates already exists.',
        ];
    }
}
