<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BirTaxTable extends Model
{
    protected $table = 'bir_tax_table';

    protected function casts(): array
    {
        return [
            'range_from' => 'decimal:2',
            'range_to' => 'decimal:2',
            'base_tax' => 'decimal:2',
            'excess_over' => 'decimal:2',
            'tax_rate' => 'decimal:4',
        ];
    }

    public static function lookupBracket(string $taxStatus, float $taxableIncome): ?self
    {
        return static::where(function ($q) use ($taxStatus) {
                $q->where('tax_status', $taxStatus)
                  ->orWhere('tax_status', 'all');
            })
            ->where('range_from', '<=', $taxableIncome)
            ->where(function ($q) use ($taxableIncome) {
                $q->whereNull('range_to')
                  ->orWhere('range_to', '>=', $taxableIncome);
            })
            ->where('is_active', true)
            ->orderByDesc('range_from')
            ->first();
    }
}
