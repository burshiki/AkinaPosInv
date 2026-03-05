<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Http\Requests\BuildAssemblyRequest;
use App\Models\Product;
use App\Services\AssemblyService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssemblyController extends Controller
{
    public function __construct(
        protected AssemblyService $assemblyService
    ) {}

    public function index()
    {
        $assemblyProducts = Product::where('is_assembled', true)
            ->where('is_active', true)
            ->with('assemblyComponents.componentProduct')
            ->orderBy('name')
            ->get();

        $componentProducts = Product::where('is_component', true)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'cost_price', 'stock_quantity']);

        return Inertia::render('Assemblies/Build', [
            'assemblyProducts'  => $assemblyProducts,
            'componentProducts' => $componentProducts,
        ]);
    }

    public function saveBom(Request $request, Product $product)
    {
        $validated = $request->validate([
            'components'                        => ['nullable', 'array'],
            'components.*.component_product_id' => ['required_with:components', 'exists:products,id'],
            'components.*.quantity_needed'      => ['required_with:components', 'integer', 'min:1'],
        ]);

        try {
            $this->assemblyService->saveBom($product, $validated['components'] ?? []);
            return back()->with('success', "BOM for \"{$product->name}\" saved. Cost price updated.");
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function show(Product $product)
    {

        $product->load('assemblyComponents.componentProduct');

        return Inertia::render('Assemblies/Build', [
            'product' => $product,
            'components' => $this->assemblyService->getBillOfMaterials($product),
        ]);
    }

    public function build(BuildAssemblyRequest $request, Product $product)
    {

        $quantity = $request->validated()['quantity'];

        try {
            $this->assemblyService->build($product, $quantity);
            return back()->with('success', "Built {$quantity} x {$product->name}.");
        } catch (InsufficientStockException $e) {
            return back()->with('error', $e->getMessage());
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
