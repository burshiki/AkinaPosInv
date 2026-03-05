<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id'              => ['required', 'exists:suppliers,id'],
            'notes'                    => ['nullable', 'string'],
            'items'                    => ['required', 'array', 'min:1'],
            'items.*.product_id'       => ['nullable', 'exists:products,id'],
            'items.*.product_name'     => ['required', 'string', 'max:255'],
            'items.*.quantity_ordered' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost'        => ['required', 'numeric', 'min:0'],
            'items.*.notes'            => ['nullable', 'string'],
        ];
    }
}
