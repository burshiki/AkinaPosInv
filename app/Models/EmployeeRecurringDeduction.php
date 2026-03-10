<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeRecurringDeduction extends Model
{
    protected $fillable = [
        'employee_id', 'type', 'description', 'total_amount',
        'amount_per_period', 'amount_remaining', 'start_date', 'end_date', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'amount_per_period' => 'decimal:2',
            'amount_remaining' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('amount_remaining', '>', 0);
    }
}
