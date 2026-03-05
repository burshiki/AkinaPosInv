<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDebtPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name'   => ['required', 'string', 'max:255'],
            'amount'          => ['required', 'numeric', 'min:0.01'],
            'payment_method'  => ['required', 'in:cash,online'],
            'bank_account_id' => [
                $this->input('payment_method') === 'online' ? 'required' : 'nullable',
                'exists:bank_accounts,id',
            ],
        ];
    }
}
