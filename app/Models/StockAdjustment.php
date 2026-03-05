<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustment extends Model
{
    protected $fillable = [
        'product_id',
        'user_id',
        'inventory_session_id',
        'type',
        'before_qty',
        'change_qty',
        'after_qty',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'before_qty' => 'integer',
            'change_qty' => 'integer',
            'after_qty'  => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function inventorySession(): BelongsTo
    {
        return $this->belongsTo(InventorySession::class);
    }
}
