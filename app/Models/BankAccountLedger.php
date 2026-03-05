<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccountLedger extends Model
{
    use HasFactory;

    protected $table = 'bank_account_ledger';

    protected $fillable = [
        'bank_account_id',
        'type',
        'amount',
        'running_balance',
        'description',
        'category',
        'reference_type',
        'reference_id',
        'performed_by',
        'transacted_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'running_balance' => 'decimal:2',
            'transacted_at' => 'datetime',
        ];
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function reference()
    {
        return $this->morphTo('reference');
    }
}
