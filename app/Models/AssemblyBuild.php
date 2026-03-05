<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssemblyBuild extends Model
{
    protected $fillable = [
        'product_id',
        'quantity',
        'built_by',
        'component_snapshot',
        'total_cost',
        'unit_cost',
        'built_at',
    ];

    protected $casts = [
        'component_snapshot' => 'array',
        'total_cost' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'built_at' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function builder()
    {
        return $this->belongsTo(User::class, 'built_by');
    }
}
