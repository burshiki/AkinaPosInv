<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('suppliers.edit');
    }

    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone'          => ['nullable', 'string', 'max:50'],
            'email'          => ['nullable', 'email', 'max:255',
                Rule::unique('suppliers', 'email')->ignore($this->route('supplier'))],
            'address'        => ['nullable', 'string'],
            'notes'          => ['nullable', 'string'],
            'is_active'      => ['boolean'],
        ];
    }
}
