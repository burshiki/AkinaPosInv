<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bill extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'bill_number',
        'supplier_id',
        'supplier_name',
        'purchase_order_id',
        'recurring_bill_template_id',
        'category',
        'subtotal',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'balance',
        'status',
        'bill_date',
        'due_date',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'     => 'decimal:2',
            'tax_amount'   => 'decimal:2',
            'total_amount' => 'decimal:2',
            'paid_amount'  => 'decimal:2',
            'balance'      => 'decimal:2',
            'bill_date'    => 'date',
            'due_date'     => 'date',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function recurringTemplate(): BelongsTo
    {
        return $this->belongsTo(RecurringBillTemplate::class, 'recurring_bill_template_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BillItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPayable(): bool
    {
        return in_array($this->status, ['unpaid', 'partially_paid']);
    }
}
