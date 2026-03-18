<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RepairJob extends Model
{
    protected $fillable = [
        'job_number',
        'customer_id',
        'customer_name',
        'customer_phone',
        'problem_description',
        'status',
        'technician_id',
        'repair_fee',
        'accepted_at',
        'started_at',
        'completed_at',
        'claimed_at',
        'sale_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'repair_fee'   => 'decimal:2',
            'accepted_at'  => 'datetime',
            'started_at'   => 'datetime',
            'completed_at' => 'datetime',
            'claimed_at'   => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function components()
    {
        return $this->hasMany(RepairJobComponent::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    public function scopeDone($query)
    {
        return $query->where('status', 'done');
    }

    public static function generateJobNumber(): string
    {
        $prefix = 'REP-' . now()->format('Ymd') . '-';
        $count = static::whereDate('created_at', today())->count() + 1;
        return $prefix . str_pad($count, 4, '0', STR_PAD_LEFT);
    }
}
