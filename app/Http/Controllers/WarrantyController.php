<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\Supplier;
use App\Models\Warranty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                WHEN 'pending'               THEN 0
                WHEN 'checking'              THEN 1
                WHEN 'confirmed'             THEN 2
                WHEN 'replacement_requested' THEN 3
                WHEN 'active'               THEN 4
                WHEN 'sent_to_supplier'      THEN 5
                WHEN 'replacement_received'  THEN 6
                ELSE 7 END")
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
        // Idempotent response for duplicate clicks or stale UI data.
        if ($warranty->status === 'confirmed') {
            return back()->with('success', 'Warranty issue is already confirmed.');
        }

        if ($warranty->status !== 'checking') {
            return back()->with('error', 'Only warranties under checking can be confirmed.');
        }

        if (empty($warranty->check_reason)) {
            return back()->withErrors(['confirm' => 'Please enter a reason before confirming the warranty claim.']);
        }

        $warranty->update(['status' => 'confirmed']);

        return back()->with('success', 'Warranty issue confirmed. Ready to send to supplier.');
    }

    /**
     * Repair resolution — send item to supplier/ASC (confirmed → sent_to_supplier).
     */
    public function sendToSupplier(Request $request, Warranty $warranty)
    {
        abort_unless(
            in_array($warranty->status, ['confirmed', 'replacement_requested']),
            422,
            'Only confirmed warranties can be sent to a supplier/ASC.'
        );

        $validated = $request->validate([
            'supplier_id'     => ['nullable', 'exists:suppliers,id'],
            'tracking_number' => ['nullable', 'string', 'max:255'],
        ]);

        $warranty->update([
            'resolution_type' => 'repair',
            'supplier_id'     => $validated['supplier_id'] ?? null,
            'tracking_number' => $validated['tracking_number'] ?? null,
            'status'          => 'sent_to_supplier',
        ]);

        $supplierName = $validated['supplier_id']
            ? Supplier::find($validated['supplier_id'])->name
            : 'the supplier/ASC';
        $tracking = $validated['tracking_number'] ? " Tracking: {$validated['tracking_number']}" : '';

        return back()->with('success', "Warranty sent to {$supplierName} for repair.{$tracking}");
    }

    /**
     * Replacement resolution — replace immediately from store inventory (confirmed → replaced).
     * Stock is decremented by 1. RA 7394 — Three R's.
     */
    public function replaceFromStock(Request $request, Warranty $warranty)
    {
        abort_unless(
            in_array($warranty->status, ['confirmed', 'replacement_requested']),
            422,
            'Only confirmed warranties can be replaced from stock.'
        );

        $product = Product::findOrFail($warranty->product_id);

        if ($product->stock_quantity < 1) {
            return back()->with('error', "Cannot replace: {$product->name} has no stock available.");
        }

        $validated = $request->validate([
            'received_serial_number' => ['nullable', 'string', 'max:255'],
            'received_notes'         => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($warranty, $product, $validated) {
            $before = $product->stock_quantity;
            $after  = $before - 1;

            $product->decrement('stock_quantity', 1);

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => null,
                'type'                 => 'warranty_replacement',
                'before_qty'           => $before,
                'change_qty'           => -1,
                'after_qty'            => $after,
                'reason'               => "Warranty replacement — #{$warranty->id} ({$warranty->customer_name})",
            ]);

            $warranty->update([
                'resolution_type'        => 'replacement',
                'status'                 => 'replaced',
                'received_serial_number' => $validated['received_serial_number'] ?? null,
                'received_notes'         => $validated['received_notes'] ?? null,
            ]);
        });

        return back()->with('success', "Replaced {$product->name} from inventory. Stock adjusted.");
    }

    /**
     * Issue a refund (confirmed → refunded). RA 7394 — Three R's.
     */
    public function refund(Warranty $warranty)
    {
        abort_unless($warranty->status === 'confirmed', 422, 'Only confirmed warranties can be refunded.');

        $warranty->update([
            'resolution_type' => 'refund',
            'status'          => 'refunded',
        ]);

        return back()->with('success', "Refund issued for warranty {$warranty->receipt_number}.");
    }

    /**
     * Receive item back from supplier/ASC (sent_to_supplier → repair_received | replacement_received).
     * replacement: stock +1 (RA 7394). repair: no stock change.
     */
    public function receiveReplacement(Request $request, Warranty $warranty)
    {
        abort_unless($warranty->status === 'sent_to_supplier', 422, 'Only warranties sent to supplier can be received back.');

        $validated = $request->validate([
            'received_serial_number' => ['nullable', 'string', 'max:255'],
            'received_notes'         => ['nullable', 'string', 'max:1000'],
        ]);

        $isReplacement = $warranty->resolution_type === 'replacement';

        $product = Product::findOrFail($warranty->product_id);

        DB::transaction(function () use ($warranty, $validated, $isReplacement, $product) {
            $before = $product->stock_quantity;
            $after  = $before + 1;

            // Always return the unit to stock (repaired unit comes back; legacy replacement also adds stock)
            $product->increment('stock_quantity', 1);

            $type   = $isReplacement ? 'warranty_replacement_received' : 'warranty_repair_received';
            $reason = $isReplacement
                ? "Supplier replacement received — warranty #{$warranty->id} ({$warranty->customer_name})"
                : "Repaired unit returned — warranty #{$warranty->id} ({$warranty->customer_name})";

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => null,
                'type'                 => $type,
                'before_qty'           => $before,
                'change_qty'           => 1,
                'after_qty'            => $after,
                'reason'               => $reason,
            ]);

            $warranty->update([
                'status'                 => $isReplacement ? 'replacement_received' : 'repair_received',
                'received_serial_number' => $validated['received_serial_number'] ?? null,
                'received_notes'         => $validated['received_notes'] ?? null,
            ]);
        });

        $msg = $isReplacement
            ? "Replacement received. Stock for {$product->name} has been updated."
            : "Repaired item received back for {$product->name}.";

        return back()->with('success', $msg);
    }
}
