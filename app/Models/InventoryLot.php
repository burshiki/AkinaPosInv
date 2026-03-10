<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryLot extends Model
{
    protected $fillable = [
        'product_id', 'product_variant_id', 'cost_price', 'quantity_received',
        'quantity_remaining', 'reference_type', 'reference_id', 'batch_number',
        'expiry_date', 'received_at',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'expiry_date' => 'date',
            'received_at' => 'date',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Get lots for FIFO consumption (oldest first).
     */
    public function scopeFifo($query, int $productId)
    {
        return $query->where('product_id', $productId)
            ->where('quantity_remaining', '>', 0)
            ->orderBy('received_at')
            ->orderBy('id');
    }
}
