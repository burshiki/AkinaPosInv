<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $fillable = [
        'employee_id', 'leave_type_id', 'year', 'total_days', 'used_days', 'cash_converted_days',
    ];

    protected function casts(): array
    {
        return [
            'total_days' => 'decimal:1',
            'used_days' => 'decimal:1',
            'cash_converted_days' => 'decimal:1',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function getRemainingDaysAttribute(): float
    {
        return (float) $this->total_days - (float) $this->used_days - (float) $this->cash_converted_days;
    }
}
