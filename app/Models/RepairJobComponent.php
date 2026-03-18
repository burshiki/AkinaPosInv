<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RepairJobComponent extends Model
{
    protected $fillable = [
        'repair_job_id',
        'product_id',
        'product_name',
        'product_sku',
        'quantity',
        'unit_price',
        'subtotal',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'integer',
            'unit_price' => 'decimal:2',
            'subtotal'   => 'decimal:2',
        ];
    }

    public function repairJob()
    {
        return $this->belongsTo(RepairJob::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
