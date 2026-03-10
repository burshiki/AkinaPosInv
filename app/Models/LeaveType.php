<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'name', 'default_days_per_year', 'is_paid', 'is_active',
        'min_service_months', 'is_cash_convertible',
    ];

    protected function casts(): array
    {
        return [
            'is_paid' => 'boolean',
            'is_active' => 'boolean',
            'is_cash_convertible' => 'boolean',
            'min_service_months' => 'integer',
        ];
    }
}
