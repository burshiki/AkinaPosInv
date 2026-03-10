<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttribute extends Model
{
    protected $fillable = ['name', 'sort_order'];

    public function values()
    {
        return $this->hasMany(ProductAttributeValue::class)->orderBy('sort_order');
    }
}
