<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:255'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $this->route('user')->id],
            'password'              => ['nullable', 'string', 'min:8'],
            'password_confirmation' => ['nullable', 'string', 'required_with:password', 'same:password'],
            'permissions'           => ['nullable', 'array'],
            'permissions.*'         => ['string', 'exists:permissions,name'],
        ];
    }
}
