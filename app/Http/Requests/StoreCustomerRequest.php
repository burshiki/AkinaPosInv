<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'    => ['required', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:50'],
            'email'   => ['nullable', 'email', 'max:255', 'unique:customers,email'],
            'address' => ['nullable', 'string'],
            'notes'   => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
