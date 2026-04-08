<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class Holiday extends Model
{
    protected $fillable = ['date', 'name', 'type', 'year'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    public static function getForPeriod($startDate, $endDate): Collection
    {
        return static::whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->get();
    }
}
