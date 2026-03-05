<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    protected $fillable = [
        'purchase_order_id',
        'product_id',
        'product_name',
        'quantity_ordered',
        'quantity_received',
        'unit_cost',
        'subtotal',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity_ordered'  => 'integer',
            'quantity_received' => 'integer',
            'unit_cost'         => 'decimal:2',
            'subtotal'          => 'decimal:2',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getRemainingQuantityAttribute(): int
    {
        return $this->quantity_ordered - $this->quantity_received;
    }
}
