<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleShipping extends Model
{
    protected $fillable = [
        'sale_id',
        'shipping_address',
        'shipping_fee',
        'fee_status',
        'courier',
        'tracking_number',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'shipping_fee' => 'decimal:2',
        ];
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
