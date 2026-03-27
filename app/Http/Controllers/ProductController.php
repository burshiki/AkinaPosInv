<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with(['category'])
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('sku', 'like', "%{$search}%")
                      ->orWhere('barcode', 'like', "%{$search}%");
                });
            })
            ->when(request('category_id'), function ($query, $categoryId) {
                $query->where('category_id', $categoryId);
            })
            ->when(request('is_active') !== null, function ($query) {
                $query->where('is_active', request('is_active'));
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Products/Index', [
            'products'   => $products,
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(),
            'filters'    => request()->only(['search', 'category_id', 'is_active']),
        ]);
    }

    public function create()
    {

        return Inertia::render('Products/Create', [
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(),
            'products' => Product::where('is_active', true)->where('is_assembled', false)->orderBy('name')->get(['id', 'name', 'sku']),
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();
        $data['cost_price'] = $data['cost_price'] ?? 0;
        $data['tax_rate']   = $data['tax_rate']   ?? 0;

        $product = Product::create($data);

        return redirect()->route('products.index')
            ->with('success', "Product {$product->name} created.");
    }

    public function show(Product $product)
    {
        $product->load(['category', 'assemblyComponents.componentProduct']);

        return Inertia::render('Products/Show', [
            'product' => $product,
            'components' => $product->is_assembled
                ? $product->assemblyComponents->map(fn ($ac) => [
                    'component_product_id' => $ac->component_product_id,
                    'component_name'       => $ac->componentProduct->name,
                    'component_sku'        => $ac->componentProduct->sku,
                    'quantity_needed'      => $ac->quantity_needed,
                    'stock_available'      => $ac->componentProduct->stock_quantity,
                ])
                : [],
        ]);
    }

    public function edit(Product $product)
    {

        $product->load('assemblyComponents');

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(),
            'products' => Product::where('is_active', true)
                ->where('is_assembled', false)
                ->where('id', '!=', $product->id)
                ->orderBy('name')
                ->get(['id', 'name', 'sku']),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();
        $data['cost_price'] = $data['cost_price'] ?? 0;
        $data['tax_rate']   = $data['tax_rate']   ?? 0;

        DB::transaction(function () use ($data, $product) {
            $beforeQty = $product->stock_quantity;
            $afterQty  = (int) ($data['stock_quantity'] ?? $beforeQty);

            $product->update($data);

            if ($afterQty !== $beforeQty) {
                StockAdjustment::create([
                    'product_id'           => $product->id,
                    'user_id'              => auth()->id(),
                    'inventory_session_id' => null,
                    'type'                 => 'product_edit',
                    'before_qty'           => $beforeQty,
                    'change_qty'           => $afterQty - $beforeQty,
                    'after_qty'            => $afterQty,
                    'reason'               => 'Quantity updated via product edit',
                ]);
            }
        });

        return redirect()->route('products.index')
            ->with('success', "Product {$product->name} updated.");
    }

    public function destroy(Product $product)
    {

        $product->delete();

        return redirect()->route('products.index')
            ->with('success', "Product deleted.");
    }
}
