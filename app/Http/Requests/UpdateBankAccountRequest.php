<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBankAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:255'],
            'type'           => ['required', 'in:cash_drawer,gcash,maya,bdo,other'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'description'    => ['nullable', 'string'],
            'is_active'      => ['nullable', 'boolean'],
        ];
    }
}
