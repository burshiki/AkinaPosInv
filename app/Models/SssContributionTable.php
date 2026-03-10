<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SssContributionTable extends Model
{
    protected $table = 'sss_contribution_table';

    protected function casts(): array
    {
        return [
            'range_from' => 'decimal:2',
            'range_to' => 'decimal:2',
            'msc' => 'decimal:2',
            'employee_share' => 'decimal:2',
            'employer_share' => 'decimal:2',
            'ec_share' => 'decimal:2',
            'total_contribution' => 'decimal:2',
        ];
    }

    public static function lookupByCompensation(float $monthlyCompensation): ?self
    {
        return static::where('range_from', '<=', $monthlyCompensation)
            ->where('range_to', '>=', $monthlyCompensation)
            ->where('is_active', true)
            ->first();
    }
}
