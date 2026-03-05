<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer')?->id;

        return [
            'name'    => ['required', 'string', 'max:255'],
            'phone'   => ['nullable', 'string', 'max:50'],
            'email'   => ['nullable', 'email', 'max:255', "unique:customers,email,{$customerId}"],
            'address' => ['nullable', 'string'],
            'notes'   => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
