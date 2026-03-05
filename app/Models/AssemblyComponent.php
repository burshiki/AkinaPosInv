<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssemblyComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'assembly_product_id',
        'component_product_id',
        'quantity_needed',
    ];

    protected function casts(): array
    {
        return [
            'quantity_needed' => 'integer',
        ];
    }

    public function assemblyProduct()
    {
        return $this->belongsTo(Product::class, 'assembly_product_id');
    }

    public function componentProduct()
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }
}
