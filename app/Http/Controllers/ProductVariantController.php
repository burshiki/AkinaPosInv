<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductVariantController extends Controller
{
    public function index(Product $product)
    {
        $product->load(['variants.attributeValues.attribute']);
        $attributes = ProductAttribute::with('values')->orderBy('sort_order')->get();

        return Inertia::render('Products/Variants', [
            'product' => $product,
            'attributes' => $attributes,
        ]);
    }

    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => ['nullable', 'string', 'max:255', 'unique:product_variants,sku'],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:product_variants,barcode'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'attribute_value_ids' => ['required', 'array', 'min:1'],
            'attribute_value_ids.*' => ['exists:product_attribute_values,id'],
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => $validated['sku'],
            'barcode' => $validated['barcode'],
            'cost_price' => $validated['cost_price'] ?? $product->cost_price,
            'selling_price' => $validated['selling_price'] ?? $product->selling_price,
            'stock_quantity' => $validated['stock_quantity'],
        ]);

        $variant->attributeValues()->attach($validated['attribute_value_ids']);

        if (!$product->has_variants) {
            $product->update(['has_variants' => true]);
        }

        return back()->with('success', 'Variant created.');
    }

    public function update(Request $request, ProductVariant $variant)
    {
        $validated = $request->validate([
            'sku' => ['nullable', 'string', 'max:255', "unique:product_variants,sku,{$variant->id}"],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'selling_price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ]);

        $variant->update($validated);

        return back()->with('success', 'Variant updated.');
    }

    public function destroy(ProductVariant $variant)
    {
        $product = $variant->product;
        $variant->delete();

        if ($product->variants()->count() === 0) {
            $product->update(['has_variants' => false]);
        }

        return back()->with('success', 'Variant deleted.');
    }

    // Manage global attributes
    public function storeAttribute(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        ProductAttribute::create($validated);
        return back()->with('success', 'Attribute created.');
    }

    public function storeAttributeValue(Request $request, ProductAttribute $attribute)
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:100'],
        ]);

        ProductAttributeValue::create([
            'product_attribute_id' => $attribute->id,
            'value' => $validated['value'],
        ]);

        return back()->with('success', 'Value added.');
    }
}
