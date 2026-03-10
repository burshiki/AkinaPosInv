<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductApiController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::with('category')
            ->when(request('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when(request('search'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%")->orWhere('sku', 'like', "%{$s}%"))
            ->when(request('active_only', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->paginate(request('per_page', 50));

        return response()->json($products);
    }

    public function show(Product $product): JsonResponse
    {
        $product->load(['category', 'variants.attributeValues.attribute']);
        return response()->json($product);
    }

    public function lowStock(): JsonResponse
    {
        $products = Product::where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->orderBy('stock_quantity')
            ->get(['id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold']);

        return response()->json($products);
    }
}
