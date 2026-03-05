<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashDrawerSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'opening_balance',
        'closing_balance',
        'expected_cash',
        'cash_sales_total',
        'difference',
        'total_transactions',
        'opening_notes',
        'closing_notes',
        'status',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'opening_balance'  => 'decimal:2',
            'closing_balance'  => 'decimal:2',
            'expected_cash'    => 'decimal:2',
            'cash_sales_total' => 'decimal:2',
            'difference'       => 'decimal:2',
            'total_transactions' => 'integer',
            'opened_at'        => 'datetime',
            'closed_at'        => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class, 'cash_drawer_session_id');
    }

    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
