<?php

namespace App\Http\Controllers;

use App\Models\CustomerDebt;
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
            'shipping_fee'    => ['required', 'numeric', 'min:0'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $oldFee = (float) ($shipping->shipping_fee ?? 0);
        $newFee = (float) $validated['shipping_fee'];

        $shipping->update([
            'shipping_fee'     => $newFee,
            'fee_status'       => 'confirmed',
            'tracking_number'  => $validated['tracking_number'] ?? $shipping->tracking_number,
            'notes'            => $validated['notes'] ?? $shipping->notes,
        ]);

        // If this is a credit sale, update the customer debt to reflect the confirmed shipping fee
        $debt = CustomerDebt::where('sale_id', $shipping->sale_id)
            ->whereIn('status', ['unpaid', 'partial'])
            ->first();

        if ($debt) {
            $feeDiff = $newFee - $oldFee;
            $newTotal  = (float) $debt->total_amount + $feeDiff;
            $newBalance = $newTotal - (float) $debt->paid_amount;
            $debt->update([
                'total_amount' => $newTotal,
                'balance'      => $newBalance,
                'status'       => $newBalance <= 0 ? 'paid' : $debt->status,
            ]);
        }

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
