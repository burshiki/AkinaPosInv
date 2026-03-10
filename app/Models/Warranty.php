<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warranty extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_id',
        'sale_item_id',
        'product_id',
        'receipt_number',
        'customer_name',
        'warranty_months',
        'serial_number',
        'expires_at',
        'status',
        'notes',
        'check_reason',
        'supplier_id',
        'tracking_number',
        'resolution_type',
        'received_serial_number',
        'received_notes',
    ];

    protected function casts(): array
    {
        return [
            'warranty_months' => 'integer',
            'expires_at'      => 'date',
        ];
    }

    /* ── Relationships ── */

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function saleItem()
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    /* ── Scopes ── */

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeExpired($query)
    {
        return $query->where('status', 'expired')->orWhere(function ($q) {
            $q->where('status', 'active')->where('expires_at', '<', now()->toDateString());
        });
    }
}
