<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\AssemblyBuild;
use App\Models\AssemblyComponent;
use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssemblyService
{
    public function build(Product $product, int $quantity): Product
    {
        if (!$product->is_assembled) {
            throw new \InvalidArgumentException('Product is not an assembled product.');
        }

        $components = $product->assemblyComponents()->with('componentProduct')->get();

        if ($components->isEmpty()) {
            throw new \InvalidArgumentException('No components defined for this assembly.');
        }

        return DB::transaction(function () use ($product, $quantity, $components) {
            $componentSnapshot = [];
            $totalCost = 0;

            foreach ($components as $component) {
                $componentProduct = Product::where('id', $component->component_product_id)
                    ->lockForUpdate()
                    ->first();

                $required = $component->quantity_needed * $quantity;

                if ($componentProduct->stock_quantity < $required) {
                    throw new InsufficientStockException(
                        "Insufficient stock for {$componentProduct->name}: " .
                        "need {$required}, have {$componentProduct->stock_quantity}"
                    );
                }

                $beforeQty = $componentProduct->stock_quantity;
                $componentProduct->decrement('stock_quantity', $required);

                // Create StockAdjustment audit record for component deduction
                StockAdjustment::create([
                    'product_id' => $componentProduct->id,
                    'user_id'    => Auth::id(),
                    'type'       => 'assembly_build',
                    'before_qty' => $beforeQty,
                    'change_qty' => -$required,
                    'after_qty'  => $beforeQty - $required,
                    'reason'     => "Assembly build: {$quantity}x {$product->name}",
                ]);

                // Snapshot component details for build history
                $componentCost = (float) $componentProduct->cost_price * $required;
                $totalCost += $componentCost;
                $componentSnapshot[] = [
                    'component_id' => $componentProduct->id,
                    'name'         => $componentProduct->name,
                    'sku'          => $componentProduct->sku,
                    'qty_used'     => $required,
                    'cost_at_build' => (float) $componentProduct->cost_price,
                    'line_cost'    => $componentCost,
                ];
            }

            $assemblyBefore = $product->stock_quantity;
            $product->increment('stock_quantity', $quantity);

            // Create StockAdjustment audit record for assembly increment
            StockAdjustment::create([
                'product_id' => $product->id,
                'user_id'    => Auth::id(),
                'type'       => 'assembly_build',
                'before_qty' => $assemblyBefore,
                'change_qty' => $quantity,
                'after_qty'  => $assemblyBefore + $quantity,
                'reason'     => "Assembly build: +{$quantity} units built",
            ]);

            // Create build history record
            AssemblyBuild::create([
                'product_id'         => $product->id,
                'quantity'           => $quantity,
                'built_by'           => Auth::id(),
                'component_snapshot' => $componentSnapshot,
                'total_cost'         => $totalCost,
                'unit_cost'          => $quantity > 0 ? round($totalCost / $quantity, 2) : 0,
                'built_at'           => now(),
            ]);

            return $product->fresh();
        });
    }

    public function saveBom(Product $product, array $components): void
    {
        if (!$product->is_assembled) {
            throw new \InvalidArgumentException('Product is not an assembled product.');
        }

        DB::transaction(function () use ($product, $components) {
            $product->assemblyComponents()->delete();

            $totalCost = 0;
            foreach ($components as $comp) {
                AssemblyComponent::create([
                    'assembly_product_id'  => $product->id,
                    'component_product_id' => $comp['component_product_id'],
                    'quantity_needed'      => $comp['quantity_needed'],
                ]);
                $componentProduct = Product::find($comp['component_product_id']);
                $totalCost += $componentProduct->cost_price * $comp['quantity_needed'];
            }

            $product->update(['cost_price' => $totalCost]);
        });
    }

    public function getBillOfMaterials(Product $product): array
    {
        return $product->assemblyComponents->map(fn ($ac) => [
            'component_product_id' => $ac->component_product_id,
            'component_name'       => $ac->componentProduct->name,
            'component_sku'        => $ac->componentProduct->sku,
            'quantity_needed'      => $ac->quantity_needed,
            'stock_available'      => $ac->componentProduct->stock_quantity,
        ])->toArray();
    }

    public function validateBuildability(Product $product, int $quantity): array
    {
        $issues = [];
        foreach ($product->assemblyComponents as $component) {
            $required = $component->quantity_needed * $quantity;
            if ($component->componentProduct->stock_quantity < $required) {
                $issues[] = [
                    'component' => $component->componentProduct->name,
                    'needed' => $required,
                    'available' => $component->componentProduct->stock_quantity,
                ];
            }
        }
        return $issues;
    }
}
