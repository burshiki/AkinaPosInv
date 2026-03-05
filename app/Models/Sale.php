<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'receipt_number',
        'official_receipt_number',
        'user_id',
        'customer_id',
        'customer_name',
        'customer_phone',
        'payment_method',
        'bank_account_id',
        'cash_drawer_session_id',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'total',
        'amount_tendered',
        'change_amount',
        'status',
        'notes',
        'sold_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'amount_tendered' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'sold_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function cashDrawerSession()
    {
        return $this->belongsTo(CashDrawerSession::class);
    }

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function customerDebt()
    {
        return $this->hasOne(CustomerDebt::class);
    }

    public function returns()
    {
        return $this->hasMany(SaleReturn::class);
    }
}
