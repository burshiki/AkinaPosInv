<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillPayment extends Model
{
    protected $fillable = [
        'bill_id',
        'payment_method',
        'amount',
        'bank_account_id',
        'cash_drawer_session_id',
        'check_number',
        'check_date',
        'reference_number',
        'paid_by',
        'notes',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'     => 'decimal:2',
            'check_date' => 'date',
            'paid_at'    => 'datetime',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function cashDrawerSession(): BelongsTo
    {
        return $this->belongsTo(CashDrawerSession::class);
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
