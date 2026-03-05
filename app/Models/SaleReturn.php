<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaleReturn extends Model
{
    protected $fillable = [
        'return_number',
        'sale_id',
        'processed_by',
        'customer_id',
        'customer_name',
        'type',
        'refund_method',
        'bank_account_id',
        'total_refund',
        'tax_refund',
        'reason',
        'notes',
        'returned_at',
    ];

    protected $casts = [
        'total_refund' => 'decimal:2',
        'tax_refund' => 'decimal:2',
        'returned_at' => 'datetime',
    ];

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function items()
    {
        return $this->hasMany(SaleReturnItem::class);
    }
}
