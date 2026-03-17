<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\Supplier;
use App\Models\Warranty;
use App\Models\WarrantyClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarrantyClaimController extends Controller
{
    /**
     * Open a new claim on an active warranty.
     */
    public function store(Request $request, Warranty $warranty)
    {
        abort_unless($warranty->status === 'active', 422, 'Only active warranties can have a claim filed.');
        abort_if($warranty->isExpired(), 422, 'This warranty has expired.');
        abort_if($warranty->hasActiveClaim(), 422, 'This warranty already has an active claim in progress.');

        $validated = $request->validate([
            'issue_description' => ['nullable', 'string', 'max:1000'],
        ]);

        $claimNumber = sprintf(
            'CLM-%s-%04d',
            now()->format('Ymd'),
            WarrantyClaim::whereDate('created_at', today())->count() + 1
        );

        WarrantyClaim::create([
            'warranty_id'       => $warranty->id,
            'claim_number'      => $claimNumber,
            'issue_description' => $validated['issue_description'] ?? null,
            'status'            => 'open',
        ]);

        return redirect()->route('warranties.show', $warranty->id)
            ->with('success', "Claim {$claimNumber} opened.");
    }

    /**
     * Confirm the issue — open → confirmed.
     * Requires an issue description.
     */
    public function confirm(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'open', 422, 'Only open claims can be confirmed.');

        $validated = $request->validate([
            'issue_description' => ['required', 'string', 'max:1000'],
        ]);

        $claim->update([
            'issue_description' => $validated['issue_description'],
            'status'            => 'confirmed',
        ]);

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', 'Issue confirmed. Choose a resolution (Repair / Replacement / Refund).');
    }

    /**
     * No defect found — item checked and returned to customer. open → no_defect.
     * Warranty remains active.
     */
    public function noDefect(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'open', 422, 'Only open claims can be closed as no defect.');

        $validated = $request->validate([
            'issue_description' => ['nullable', 'string', 'max:1000'],
            'resolution_notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $claim->update([
            'issue_description' => $validated['issue_description'] ?? $claim->issue_description,
            'resolution_notes'  => $validated['resolution_notes'] ?? null,
            'status'            => 'no_defect',
            'resolved_at'       => now(),
        ]);

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', "No defect found. Item returned to customer. Warranty remains active.");
    }

    /**
     * Repair resolution — send to supplier/ASC. confirmed → in_repair.
     */
    public function sendToSupplier(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'confirmed', 422, 'Only confirmed claims can be sent to a supplier.');

        $validated = $request->validate([
            'resolution_type' => ['nullable', 'in:repair,replacement'],
            'supplier_id'     => ['nullable', 'exists:suppliers,id'],
            'tracking_number' => ['nullable', 'string', 'max:255'],
        ]);

        $resolutionType = $validated['resolution_type'] ?? 'repair';

        $claim->update([
            'resolution_type' => $resolutionType,
            'supplier_id'     => $validated['supplier_id'] ?? null,
            'tracking_number' => $validated['tracking_number'] ?? null,
            'status'          => 'in_repair',
        ]);

        $supplierName = $validated['supplier_id']
            ? Supplier::find($validated['supplier_id'])->name
            : 'the supplier/ASC';

        $msg = $resolutionType === 'replacement'
            ? "Sent to {$supplierName} for replacement. A claiming stub can be printed for the customer."
            : "Sent to {$supplierName} for repair.";

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', $msg);
    }

    /**
     * Render a printable claiming stub for the customer.
     * Only applicable for in_repair claims with resolution_type = replacement.
     */
    public function claimingStub(WarrantyClaim $claim)
    {
        abort_unless(
            in_array($claim->status, ['in_repair', 'resolved']) && in_array($claim->resolution_type, ['repair', 'replacement']),
            403,
            'Claiming stub is only available for repair or replacement claims.'
        );

        $claim->load(['warranty.product', 'supplier']);

        return inertia('Warranties/ClaimingStub', [
            'claim'   => $claim,
            'appName' => config('app.name'),
        ]);
    }

    /**
     * Replacement from store inventory. confirmed → resolved.
     * Stock -1, old warranty → replaced, new active warranty created.
     */
    public function replaceFromStock(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'confirmed', 422, 'Only confirmed claims can be resolved with a replacement.');

        $warranty = $claim->warranty;
        $product  = Product::findOrFail($warranty->product_id);

        if ($product->stock_quantity < 1) {
            return back()->with('error', "Cannot replace: {$product->name} has no stock available.");
        }

        $validated = $request->validate([
            'received_serial_number' => ['nullable', 'string', 'max:255', 'unique:warranties,serial_number'],
            'resolution_notes'       => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($claim, $warranty, $product, $validated) {
            $before = $product->stock_quantity;
            $product->decrement('stock_quantity', 1);

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => null,
                'type'                 => 'warranty_replacement',
                'before_qty'           => $before,
                'change_qty'           => -1,
                'after_qty'            => $before - 1,
                'reason'               => "Warranty replacement — {$claim->claim_number} ({$warranty->customer_name})",
            ]);

            $claim->update([
                'resolution_type'        => 'replacement',
                'received_serial_number' => $validated['received_serial_number'] ?? null,
                'resolution_notes'       => $validated['resolution_notes'] ?? null,
                'status'                 => 'resolved',
                'resolved_at'            => now(),
                // Defective unit is now with the store — needs to be returned to supplier
                'defective_status'       => 'pending',
            ]);

            $warranty->update(['status' => 'replaced']);

            // New active warranty for the replacement unit
            Warranty::create([
                'parent_warranty_id' => $warranty->id,
                'sale_id'            => $warranty->sale_id,
                'sale_item_id'       => $warranty->sale_item_id,
                'product_id'         => $warranty->product_id,
                'receipt_number'     => $warranty->receipt_number,
                'customer_name'      => $warranty->customer_name,
                'warranty_months'    => $warranty->warranty_months,
                'serial_number'      => $validated['received_serial_number'] ?? null,
                'activated_at'       => now(),
                'expires_at'         => now()->addMonths($warranty->warranty_months)->toDateString(),
                'status'             => 'active',
            ]);
        });

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', "Replaced from inventory. New warranty created for the replacement unit.");
    }

    /**
     * Refund resolution. confirmed → resolved. Warranty → void.
     */
    public function refund(WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'confirmed', 422, 'Only confirmed claims can be refunded.');

        DB::transaction(function () use ($claim) {
            $claim->update([
                'resolution_type' => 'refund',
                'status'          => 'resolved',
                'resolved_at'     => now(),
            ]);

            $claim->warranty->update(['status' => 'void']);
        });

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', 'Refund issued. Warranty has been voided.');
    }

    /**
     * Send the defective unit (returned by customer) to the supplier for repair/replacement.
     * Only applicable after a from-stock replacement (defective_status = pending).
     */
    public function sendDefectiveToSupplier(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->defective_status === 'pending', 422, 'No defective unit pending to send.');

        $validated = $request->validate([
            'supplier_id'               => ['nullable', 'exists:suppliers,id'],
            'defective_tracking_number' => ['nullable', 'string', 'max:255'],
        ]);

        $claim->update([
            'defective_status'          => 'sent',
            'defective_supplier_id'     => $validated['supplier_id'] ?? null,
            'defective_tracking_number' => $validated['defective_tracking_number'] ?? null,
        ]);

        $supplierName = $validated['supplier_id']
            ? Supplier::find($validated['supplier_id'])->name
            : 'the supplier/ASC';

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', "Defective unit sent to {$supplierName}.");
    }

    /**
     * Receive the defective unit back from supplier (repaired or replaced).
     * Adds 1 unit back to stock. defective_status → received.
     */
    public function receiveDefectiveBack(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->defective_status === 'sent', 422, 'No defective unit sent to supplier yet.');

        $validated = $request->validate([
            'resolution_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $warranty = $claim->warranty;
        $product  = Product::findOrFail($warranty->product_id);

        DB::transaction(function () use ($claim, $product, $warranty, $validated) {
            $before = $product->stock_quantity;
            $product->increment('stock_quantity', 1);

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => null,
                'type'                 => 'warranty_defective_received',
                'before_qty'           => $before,
                'change_qty'           => 1,
                'after_qty'            => $before + 1,
                'reason'               => "Defective unit returned from supplier — {$claim->claim_number} ({$warranty->customer_name})",
            ]);

            $claim->update([
                'defective_status'      => 'received',
                'defective_received_at' => now(),
                'resolution_notes'      => $validated['resolution_notes']
                                           ? ($claim->resolution_notes ? $claim->resolution_notes . "\n" . $validated['resolution_notes'] : $validated['resolution_notes'])
                                           : $claim->resolution_notes,
            ]);
        });

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', "Defective unit received from supplier. 1 unit of {$product->name} added to inventory.");
    }

    /**
     * Receive item back from supplier. in_repair → resolved.
     * If replacement: old warranty → replaced, new active warranty created.
     * If repair: warranty stays active.
     */
    public function receiveBack(Request $request, WarrantyClaim $claim)
    {
        abort_unless($claim->status === 'in_repair', 422, 'Only in-repair claims can be received back.');

        $validated = $request->validate([
            'received_serial_number' => ['nullable', 'string', 'max:255', 'unique:warranties,serial_number'],
            'resolution_notes'       => ['nullable', 'string', 'max:1000'],
        ]);

        $isReplacement = $claim->resolution_type === 'replacement';
        $warranty      = $claim->warranty;

        DB::transaction(function () use ($claim, $warranty, $validated, $isReplacement) {
            $claim->update([
                'received_serial_number' => $validated['received_serial_number'] ?? null,
                'resolution_notes'       => $validated['resolution_notes'] ?? null,
                'status'                 => 'resolved',
                'resolved_at'            => now(),
            ]);

            if ($isReplacement) {
                $warranty->update(['status' => 'replaced']);

                Warranty::create([
                    'parent_warranty_id' => $warranty->id,
                    'sale_id'            => $warranty->sale_id,
                    'sale_item_id'       => $warranty->sale_item_id,
                    'product_id'         => $warranty->product_id,
                    'receipt_number'     => $warranty->receipt_number,
                    'customer_name'      => $warranty->customer_name,
                    'warranty_months'    => $warranty->warranty_months,
                    'serial_number'      => $validated['received_serial_number'] ?? null,
                    'activated_at'       => now(),
                    'expires_at'         => now()->addMonths($warranty->warranty_months)->toDateString(),
                    'status'             => 'active',
                ]);
            }
            // For repair: warranty stays active — no status change needed
        });

        $msg = $isReplacement
            ? 'Replacement received. New warranty created for the replacement unit.'
            : 'Repaired item received. Item returned to customer. Warranty remains active.';

        return redirect()->route('warranties.show', $claim->warranty_id)
            ->with('success', $msg);
    }
}
