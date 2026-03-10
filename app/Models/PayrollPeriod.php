<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollPeriod extends Model
{
    protected $fillable = [
        'name', 'period_start', 'period_end', 'status',
        'created_by', 'approved_by', 'approved_at', 'paid_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'approved_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }

    public function payrollRecords()
    {
        return $this->hasMany(PayrollRecord::class);
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function scopeLocked($query)
    {
        return $query->where('status', 'locked');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }
}
