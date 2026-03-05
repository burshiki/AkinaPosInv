<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'sku',
        'barcode',
        'description',
        'cost_price',
        'selling_price',
        'tax_rate',
        'is_vat_exempt',
        'stock_quantity',
        'low_stock_threshold',
        'is_assembled',
        'is_component',
        'has_warranty',
        'warranty_months',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'selling_price' => 'decimal:2',
            'stock_quantity' => 'integer',
            'low_stock_threshold' => 'integer',
            'is_assembled' => 'boolean',
            'is_component' => 'boolean',
            'has_warranty' => 'boolean',
            'warranty_months' => 'integer',
            'is_active' => 'boolean',
            'tax_rate' => 'decimal:2',
            'is_vat_exempt' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function assemblyComponents()
    {
        return $this->hasMany(AssemblyComponent::class, 'assembly_product_id');
    }

    public function usedInAssemblies()
    {
        return $this->hasMany(AssemblyComponent::class, 'component_product_id');
    }

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function assemblyBuilds()
    {
        return $this->hasMany(AssemblyBuild::class);
    }

    public function isLowStock(): bool
    {
        return $this->stock_quantity <= $this->low_stock_threshold;
    }

    /**
     * Accessor alias for reports that reference reorder_level.
     */
    public function getReorderLevelAttribute(): int
    {
        return $this->low_stock_threshold;
    }
}
