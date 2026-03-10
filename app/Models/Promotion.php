<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'name', 'description', 'type', 'value', 'buy_quantity', 'get_quantity',
        'min_purchase', 'starts_at', 'ends_at', 'is_active', 'usage_limit',
        'usage_count', 'applies_to', 'customer_tier',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_purchase' => 'decimal:2',
            'starts_at' => 'date',
            'ends_at' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function items()
    {
        return $this->hasMany(PromotionItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', now());
            })
            ->where(function ($q) {
                $q->whereNull('usage_limit')->orWhereColumn('usage_count', '<', 'usage_limit');
            });
    }

    public function appliesToProduct(Product $product): bool
    {
        if ($this->applies_to === 'all') return true;

        return $this->items()->where(function ($q) use ($product) {
            $q->where(function ($q2) use ($product) {
                $q2->where('item_type', 'product')->where('item_id', $product->id);
            })->orWhere(function ($q2) use ($product) {
                $q2->where('item_type', 'category')->where('item_id', $product->category_id);
            });
        })->exists();
    }
}
