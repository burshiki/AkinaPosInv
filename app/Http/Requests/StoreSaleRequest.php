<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id'        => ['nullable', 'exists:customers,id'],
            'customer_name'      => ['nullable', 'string', 'max:255'],
            'customer_phone'     => ['nullable', 'string', 'max:50'],
            'payment_method'     => ['required', 'in:cash,online,credit'],
            'bank_account_id'    => ['required_if:payment_method,online',
                                     'nullable', 'exists:bank_accounts,id'],
            'amount_tendered'    => ['required_if:payment_method,cash',
                                     'nullable', 'numeric', 'min:0'],
            'discount_amount'    => ['nullable', 'numeric', 'min:0'],
            'discount_type'      => ['nullable', 'in:amount,percent'],
            'notes'              => ['nullable', 'string', 'max:1000'],
            'repair_job_id'        => ['nullable', 'integer', 'exists:repair_jobs,id'],
            'has_shipping'         => ['nullable', 'boolean'],
            'shipping_fee'         => ['nullable', 'numeric', 'min:0'],
            'shipping_notes'       => ['nullable', 'string', 'max:500'],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.product_id'   => ['nullable', 'integer', 'exists:products,id'],
            'items.*.product_name' => ['nullable', 'string', 'max:255'],
            'items.*.quantity'     => ['required', 'integer', 'min:1'],
            'items.*.unit_price'   => ['required', 'numeric', 'min:0'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.discount_type'   => ['nullable', 'in:amount,percent'],
        ];
    }
}
