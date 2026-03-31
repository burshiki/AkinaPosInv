<?php

namespace App\Http\Controllers;

use App\Models\SaleShipping;
use Illuminate\Http\Request;

class SaleShippingController extends Controller
{
    /**
     * Confirm the shipping fee amount.
     */
    public function confirmFee(Request $request, SaleShipping $shipping)
    {
        $validated = $request->validate([
            'shipping_fee' => ['required', 'numeric', 'min:0'],
            'courier'      => ['nullable', 'string', 'max:100'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ]);

        $shipping->update([
            'shipping_fee'     => $validated['shipping_fee'],
            'fee_status'       => 'confirmed',
            'courier'          => $validated['courier'] ?? $shipping->courier,
            'tracking_number'  => $validated['tracking_number'] ?? $shipping->tracking_number,
            'notes'            => $validated['notes'] ?? $shipping->notes,
        ]);

        return back()->with('success', 'Shipping fee confirmed.');
    }

    /**
     * Mark shipping fee as paid by the customer.
     */
    public function markPaid(SaleShipping $shipping)
    {
        if ($shipping->fee_status !== 'confirmed') {
            return back()->with('error', 'Shipping fee must be confirmed before marking as paid.');
        }

        $shipping->update(['fee_status' => 'paid']);

        return back()->with('success', 'Shipping fee marked as paid.');
    }
}
