<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\Warranty;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WarrantyController extends Controller
{
    public function index()
    {
        // Auto-expire warranties whose expire_at has passed
        Warranty::where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now()->toDateString())
            ->update(['status' => 'expired']);

        $warranties = Warranty::with(['product', 'sale', 'supplier'])
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(request('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('receipt_number', 'like', "%{$search}%")
                          ->orWhere('customer_name', 'like', "%{$search}%")
                          ->orWhere('serial_number', 'like', "%{$search}%");
                });
            })
            ->orderByRaw("CASE status
                WHEN 'pending'          THEN 0
                WHEN 'checking'         THEN 1
                WHEN 'confirmed'        THEN 2
                WHEN 'active'           THEN 3
                WHEN 'sent_to_supplier' THEN 4
                ELSE 5 END")
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $suppliers = Supplier::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Warranties/Index', [
            'warranties'   => $warranties,
            'pendingCount' => Warranty::pending()->count(),
            'filters'      => request()->only(['search', 'status']),
            'suppliers'    => $suppliers,
        ]);
    }

    public function recordSerial(Request $request, Warranty $warranty)
    {
        $validated = $request->validate([
            'serial_number' => ['nullable', 'string', 'max:255'],
            'notes'         => ['nullable', 'string'],
        ]);

        $expiresAt = now()->addMonths($warranty->warranty_months)->toDateString();

        $warranty->update([
            'serial_number' => $validated['serial_number'] ?? null,
            'notes'         => $validated['notes'] ?? null,
            'expires_at'    => $expiresAt,
            'status'        => 'active',
        ]);

        return back()->with('success', "Warranty activated for {$warranty->product->name}. Expires {$expiresAt}.");
    }

    /**
     * Initiate a warranty check (active → checking).
     * check_reason is optional; status is always set to 'checking'.
     */
    public function check(Request $request, Warranty $warranty)
    {
        abort_unless(in_array($warranty->status, ['active', 'checking']), 422, 'Warranty cannot be checked in its current state.');

        $validated = $request->validate([
            'check_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $warranty->update([
            'status'       => 'checking',
            'check_reason' => $validated['check_reason'] ?? $warranty->check_reason,
        ]);

        return back()->with('success', 'Warranty claim initiated.');
    }

    /**
     * Confirm the warranty issue (checking → confirmed).
     * Requires check_reason to be present.
     */
    public function confirm(Warranty $warranty)
    {
        abort_unless($warranty->status === 'checking', 422, 'Only warranties under checking can be confirmed.');

        if (empty($warranty->check_reason)) {
            return back()->withErrors(['confirm' => 'Please enter a reason before confirming the warranty claim.']);
        }

        $warranty->update(['status' => 'confirmed']);

        return back()->with('success', 'Warranty issue confirmed. Ready to send to supplier.');
    }

    /**
     * Send the warranty to supplier (confirmed → sent_to_supplier).
     */
    public function sendToSupplier(Request $request, Warranty $warranty)
    {
        abort_unless($warranty->status === 'confirmed', 422, 'Only confirmed warranties can be sent to a supplier.');

        $validated = $request->validate([
            'supplier_id'     => ['required', 'exists:suppliers,id'],
            'tracking_number' => ['required', 'string', 'max:255'],
        ]);

        $warranty->update([
            'supplier_id'     => $validated['supplier_id'],
            'tracking_number' => $validated['tracking_number'],
            'status'          => 'sent_to_supplier',
        ]);

        $supplier = Supplier::find($validated['supplier_id']);

        return back()->with('success', "Warranty sent to {$supplier->name}. Tracking: {$validated['tracking_number']}");
    }
}
