<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleReturnRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'            => ['required', 'in:refund,exchange'],
            'refund_method'   => ['required_if:type,refund', 'in:cash,online'],
            'bank_account_id' => ['required_if:refund_method,online', 'nullable', 'exists:bank_accounts,id'],
            'reason'          => ['nullable', 'string', 'max:500'],
            'notes'           => ['nullable', 'string', 'max:1000'],
            'items'           => ['required', 'array', 'min:1'],
            'items.*.sale_item_id'       => ['required', 'exists:sale_items,id'],
            'items.*.quantity_returned'  => ['required', 'integer', 'min:1'],
            'items.*.restock'            => ['nullable', 'boolean'],
        ];
    }
}
