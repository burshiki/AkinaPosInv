<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warranty extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_warranty_id',
        'sale_id',
        'sale_item_id',
        'product_id',
        'receipt_number',
        'customer_name',
        'warranty_months',
        'serial_number',
        'activated_at',
        'expires_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'warranty_months' => 'integer',
            'activated_at'    => 'datetime',
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

    public function parentWarranty()
    {
        return $this->belongsTo(Warranty::class, 'parent_warranty_id');
    }

    public function childWarranty()
    {
        return $this->hasOne(Warranty::class, 'parent_warranty_id');
    }

    public function claims()
    {
        return $this->hasMany(WarrantyClaim::class)->orderByDesc('created_at');
    }

    public function activeClaim()
    {
        return $this->hasOne(WarrantyClaim::class)
            ->whereIn('status', ['open', 'confirmed', 'in_repair'])
            ->latestOfMany();
    }

    /* ── Scopes ── */

    public function scopePending($query)
    {
        return $query->where('status', 'pending_serial');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /* ── Helpers ── */

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasActiveClaim(): bool
    {
        return $this->claims()
            ->whereIn('status', ['open', 'confirmed', 'in_repair'])
            ->exists();
    }
}
