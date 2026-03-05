<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'po_number',
        'supplier_id',
        'supplier_name',
        'supplier_phone',
        'supplier_email',
        'supplier_address',
        'status',
        'notes',
        'rejection_notes',
        'subtotal',
        'shipping_fee',
        'total',
        'ordered_at',
        'approved_at',
        'received_at',
        'created_by',
        'approved_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'     => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'total'        => 'decimal:2',
            'ordered_at'  => 'datetime',
            'approved_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function isEditable(): bool
    {
        return $this->status === 'draft';
    }

    public function isReceivable(): bool
    {
        return in_array($this->status, ['ordered', 'partially_received']);
    }

    public function isCancellable(): bool
    {
        return in_array($this->status, ['draft', 'ordered']);
    }
}
