<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashDrawerTransfer extends Model
{
    protected $fillable = [
        'cash_drawer_session_id',
        'bank_account_id',
        'performed_by',
        'direction',
        'amount',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function session()
    {
        return $this->belongsTo(CashDrawerSession::class, 'cash_drawer_session_id');
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }
}
