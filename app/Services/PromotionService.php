<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Support\Collection;

class PromotionService
{
    /**
     * Get all active promotions applicable to a given cart and customer.
     *
     * @param array $cartItems [{product_id, quantity, unit_price}]
     * @param Customer|null $customer
     * @return Collection of applicable promotions with computed discount
     */
    public function getApplicablePromotions(array $cartItems, ?Customer $customer = null): Collection
    {
        $promotions = Promotion::active()->with('items')->get();
        $subtotal = collect($cartItems)->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

        return $promotions->filter(function (Promotion $promo) use ($cartItems, $customer, $subtotal) {
            // Check minimum purchase
            if ($promo->min_purchase > 0 && $subtotal < $promo->min_purchase) {
                return false;
            }

            // Check customer tier restriction
            if ($promo->customer_tier && $customer) {
                if ($customer->loyalty_tier !== $promo->customer_tier) {
                    return false;
                }
            } elseif ($promo->customer_tier && !$customer) {
                return false;
            }

            // Check if at least one cart item is in promotion scope
            if ($promo->applies_to !== 'all') {
                $productIds = collect($cartItems)->pluck('product_id');
                $products = Product::whereIn('id', $productIds)->get();
                return $products->contains(fn ($p) => $promo->appliesToProduct($p));
            }

            return true;
        })->map(function (Promotion $promo) use ($cartItems, $subtotal) {
            $discount = $this->calculateDiscount($promo, $cartItems, $subtotal);
            return [
                'id' => $promo->id,
                'name' => $promo->name,
                'type' => $promo->type,
                'discount' => $discount,
            ];
        })->filter(fn ($p) => $p['discount'] > 0)->values();
    }

    /**
     * Calculate discount amount for a promotion given cart items.
     */
    public function calculateDiscount(Promotion $promo, array $cartItems, float $subtotal): float
    {
        return match ($promo->type) {
            'percentage' => round($subtotal * ($promo->value / 100), 2),
            'fixed_amount' => min((float) $promo->value, $subtotal),
            'buy_x_get_y' => $this->calculateBuyXGetY($promo, $cartItems),
            default => 0,
        };
    }

    private function calculateBuyXGetY(Promotion $promo, array $cartItems): float
    {
        if (!$promo->buy_quantity || !$promo->get_quantity) return 0;

        // Find applicable products, sum their quantities
        $totalQty = 0;
        $cheapestPrice = PHP_FLOAT_MAX;

        foreach ($cartItems as $item) {
            $product = Product::find($item['product_id']);
            if (!$product) continue;

            if ($promo->applies_to === 'all' || $promo->appliesToProduct($product)) {
                $totalQty += $item['quantity'];
                $cheapestPrice = min($cheapestPrice, (float) $item['unit_price']);
            }
        }

        $setSize = $promo->buy_quantity + $promo->get_quantity;
        $freeSets = intdiv($totalQty, $setSize);

        return $freeSets * $promo->get_quantity * $cheapestPrice;
    }

    /**
     * Record promotion usage after a sale.
     */
    public function recordUsage(int $promotionId): void
    {
        Promotion::where('id', $promotionId)->increment('usage_count');
    }
}
