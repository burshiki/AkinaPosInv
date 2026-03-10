<?php

namespace App\Services;

use App\Models\AssemblyComponent;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseOrderService
{
    public function __construct(
        protected AccountsPayableService $apService
    ) {}
    public function generatePONumber(): string
    {
        $prefix = 'PO-' . date('Ymd') . '-';
        $last = PurchaseOrder::where('po_number', 'like', $prefix . '%')
            ->orderByDesc('po_number')
            ->value('po_number');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function createOrder(array $data, int $userId): PurchaseOrder
    {
        return DB::transaction(function () use ($data, $userId) {
            $subtotal = collect($data['items'])->sum(
                fn ($i) => $i['quantity_ordered'] * $i['unit_cost']
            );

            // Snapshot supplier info from the suppliers table
            $supplier = Supplier::find($data['supplier_id']);

            $po = PurchaseOrder::create([
                'po_number'        => $this->generatePONumber(),
                'supplier_id'      => $data['supplier_id'],
                'supplier_name'    => $supplier?->name ?? '',
                'supplier_phone'   => $supplier?->phone,
                'supplier_email'   => $supplier?->email,
                'supplier_address' => $supplier?->address,
                'status'           => 'draft',
                'notes'            => $data['notes'] ?? null,
                'subtotal'         => $subtotal,
                'total'            => $subtotal,
                'created_by'       => $userId,
            ]);

            foreach ($data['items'] as $item) {
                $po->items()->create([
                    'product_id'        => $item['product_id'] ?? null,
                    'product_name'      => $item['product_name'],
                    'quantity_ordered'  => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost'         => $item['unit_cost'],
                    'subtotal'          => $item['quantity_ordered'] * $item['unit_cost'],
                    'notes'             => $item['notes'] ?? null,
                ]);
            }

            return $po;
        });
    }

    /**
     * Transition draft → approved.
     */
    public function approve(PurchaseOrder $po, int $approvedBy): PurchaseOrder
    {
        $po->update([
            'status'      => 'approved',
            'approved_at' => now(),
            'approved_by' => $approvedBy,
        ]);
        return $po;
    }

    public function receiveItems(PurchaseOrder $po, array $items, float $shippingFee = 0, ?string $notes = null, ?string $billDueDate = null): PurchaseOrder
    {
        return DB::transaction(function () use ($po, $items, $shippingFee, $notes, $billDueDate) {
            foreach ($items as $itemData) {
                /** @var PurchaseOrderItem $item */
                $item = $po->items()->findOrFail($itemData['id']);

                $remaining = $item->quantity_ordered - $item->quantity_received;
                $newQty = min((int) $itemData['quantity_received'], $remaining);
                if ($newQty <= 0) continue;

                $item->increment('quantity_received', $newQty);

                if ($item->product_id) {
                    $product = Product::lockForUpdate()->find($item->product_id);
                    if ($product) {
                        $currentStock = max(0, $product->stock_quantity);
                        $currentCost  = (float) $product->cost_price;
                        $incomingCost = (float) $item->unit_cost;

                        // Weighted average cost
                        $totalUnits = $currentStock + $newQty;
                        $newAvgCost = $totalUnits > 0
                            ? (($currentStock * $currentCost) + ($newQty * $incomingCost)) / $totalUnits
                            : $incomingCost;

                        $product->update([
                            'stock_quantity' => $currentStock + $newQty,
                            'cost_price'     => round($newAvgCost, 4),
                        ]);

                        StockAdjustment::create([
                            'product_id'  => $product->id,
                            'user_id'     => Auth::id(),
                            'type'        => 'purchase',
                            'before_qty'  => $currentStock,
                            'change_qty'  => $newQty,
                            'after_qty'   => $currentStock + $newQty,
                            'reason'      => "PO #{$po->po_number}",
                        ]);

                        // Propagate cost change to parent assemblies
                        $this->propagateComponentCostToAssemblies($product);
                    }
                }
            }

            $po->load('items');
            $totalOrdered  = $po->items->sum('quantity_ordered');
            $totalReceived = $po->items->sum('quantity_received');

            if ($totalReceived >= $totalOrdered) {
                $status = 'received';
            } elseif ($totalReceived > 0) {
                $status = 'partially_received';
            } else {
                $status = $po->status;
            }

            $newShipping = $po->shipping_fee + $shippingFee;
            $po->update([
                'status'       => $status,
                'shipping_fee' => $newShipping,
                'total'        => $po->subtotal + $newShipping,
                'received_at'  => $status === 'received' ? now() : $po->received_at,
                'notes'        => $notes
                    ? ($po->notes ? $po->notes . "\n" . $notes : $notes)
                    : $po->notes,
            ]);

            // Auto-create bill when PO is fully received
            if ($status === 'received' && !$po->bill) {
                $this->apService->createBillFromPurchaseOrder($po->fresh('items'), $billDueDate);
            }

            return $po->fresh('items');
        });
    }

    public function cancelOrder(PurchaseOrder $po): PurchaseOrder
    {
        $po->update(['status' => 'cancelled']);
        return $po;
    }

    /**
     * When a component's cost changes (via PO receive), recalculate the cost_price
     * for every assembly that uses this component.
     */
    protected function propagateComponentCostToAssemblies(Product $component): void
    {
        $parentAssemblyIds = AssemblyComponent::where('component_product_id', $component->id)
            ->pluck('assembly_product_id')
            ->unique();

        foreach ($parentAssemblyIds as $assemblyId) {
            $assembly = Product::find($assemblyId);
            if (!$assembly || !$assembly->is_assembled) {
                continue;
            }

            $totalCost = 0;
            $components = $assembly->assemblyComponents()->with('componentProduct')->get();
            foreach ($components as $ac) {
                $totalCost += (float) $ac->componentProduct->cost_price * $ac->quantity_needed;
            }

            $assembly->update(['cost_price' => round($totalCost, 2)]);
        }
    }
}
