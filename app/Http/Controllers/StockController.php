<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\CashDrawerSession;
use App\Models\InventorySession;
use App\Models\Product;
use App\Models\StockAdjustment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class StockController extends Controller
{
    public function index()
    {
        $products = Product::with('category')
            ->when(request('search'), fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('sku',  'like', "%{$s}%"))
            ->when(request('category_id'), fn ($q, $id) =>
                $q->where('category_id', $id))
            ->when(request('low_stock') === '1', fn ($q) =>
                $q->whereColumn('stock_quantity', '<=', 'low_stock_threshold'))
            ->where('is_active', true)
            ->orderBy('name')
            ->paginate(50)
            ->withQueryString();

        $categories = Category::orderBy('name')->get(['id', 'name']);

        $activeSession = InventorySession::current();

        return Inertia::render('Stock/Index', [
            'products'       => $products,
            'categories'     => $categories,
            'activeSession'  => $activeSession,
            'filters'        => request()->only(['search', 'category_id', 'low_stock']),
        ]);
    }

    public function countSheet()
    {
        $categories = Category::with(['products' => function ($q) {
            $q->where('is_active', true)->orderBy('name');
        }])->orderBy('name')->get();

        $uncategorized = Product::where('is_active', true)
            ->whereNull('category_id')
            ->orderBy('name')
            ->get();

        $totalProducts = $categories->sum(fn ($c) => $c->products->count())
                       + $uncategorized->count();

        return response()->view('stock.count-sheet', [
            'categories'    => $categories,
            'uncategorized' => $uncategorized,
            'totalProducts' => $totalProducts,
        ]);
    }

    public function transactions()
    {
        $adjustments = $this->buildTransactionsQuery()
            ->paginate(50)
            ->withQueryString();

        return Inertia::render('Stock/Transactions', [
            'adjustments' => $adjustments,
            'filters'     => request()->only(['search', 'type', 'reason', 'date_from', 'date_to']),
        ]);
    }

    public function transactionsPrint()
    {
        $adjustments = $this->buildTransactionsQuery()->get();

        return response()->view('stock.transactions-print', [
            'adjustments' => $adjustments,
            'filters'     => request()->only(['search', 'type', 'reason', 'date_from', 'date_to']),
        ]);
    }

    private function buildTransactionsQuery()
    {
        return StockAdjustment::with(['product', 'user', 'inventorySession'])
            ->when(request('search'), fn ($q, $s) =>
                $q->whereHas('product', fn ($pq) =>
                    $pq->where('name', 'like', "%{$s}%")
                       ->orWhere('sku',  'like', "%{$s}%")))
            ->when(request('type'),      fn ($q, $t) => $q->where('type', $t))
            ->when(request('reason'),    fn ($q, $r) => $q->where('reason', 'like', "%{$r}%"))
            ->when(request('date_from'), fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when(request('date_to'),   fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderByDesc('created_at');
    }

    public function adjust(Request $request, Product $product)
    {
        $validated = $request->validate([
            'adjustment_type' => ['required', 'in:add,subtract,set'],
            'quantity'        => ['required', 'integer', 'min:0'],
            'reason'          => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated, $product) {
            $before = $product->stock_quantity;

            $after = match ($validated['adjustment_type']) {
                'add'      => $before + $validated['quantity'],
                'subtract' => max(0, $before - $validated['quantity']),
                'set'      => $validated['quantity'],
            };

            $change = $after - $before;

            $product->update(['stock_quantity' => $after]);

            StockAdjustment::create([
                'product_id'            => $product->id,
                'user_id'               => auth()->id(),
                'inventory_session_id'  => null,
                'type'                  => 'manual',
                'before_qty'            => $before,
                'change_qty'            => $change,
                'after_qty'             => $after,
                'reason'                => $validated['reason'] ?? null,
            ]);
        });

        return back()->with('success', "Stock for {$product->name} updated to {$product->fresh()->stock_quantity}.");
    }

    public function internalUse(Request $request, Product $product)
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
            'purpose'  => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($validated, $product) {
            $before = $product->stock_quantity;
            $after  = max(0, $before - $validated['quantity']);
            $change = $after - $before;

            $product->update(['stock_quantity' => $after]);

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => null,
                'type'                 => 'internal_use',
                'before_qty'           => $before,
                'change_qty'           => $change,
                'after_qty'            => $after,
                'reason'               => $validated['purpose'] ?? null,
            ]);
        });

        return back()->with('success', "Recorded internal use of {$validated['quantity']} unit(s) of {$product->name}.");
    }

    public function inventoryCount(Request $request, Product $product)
    {
        abort_unless(InventorySession::isActive(), 422, 'No active inventory session.');

        $validated = $request->validate([
            'counted_qty' => ['required', 'integer', 'min:0'],
            'reason'      => ['nullable', 'string', 'max:500'],
        ]);

        $session = InventorySession::current();

        DB::transaction(function () use ($validated, $product, $session) {
            $before = $product->stock_quantity;
            $after  = $validated['counted_qty'];
            $change = $after - $before;

            $product->update(['stock_quantity' => $after]);

            StockAdjustment::create([
                'product_id'           => $product->id,
                'user_id'              => auth()->id(),
                'inventory_session_id' => $session->id,
                'type'                 => 'inventory_count',
                'before_qty'           => $before,
                'change_qty'           => $change,
                'after_qty'            => $after,
                'reason'               => $validated['reason'] ?? 'Inventory count',
            ]);
        });

        return back()->with('success', "Count saved for {$product->name}.");
    }

    public function startInventory(Request $request)
    {
        if (InventorySession::isActive()) {
            return back()->with('error', 'An inventory session is already active.');
        }

        // Require all cash drawers to be closed
        $openDrawer = CashDrawerSession::open()->exists();
        if ($openDrawer) {
            return back()->with('error', 'Please close all cash drawer sessions before starting an inventory count.');
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        InventorySession::create([
            'started_by' => auth()->id(),
            'started_at' => now(),
            'status'     => 'active',
            'notes'      => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Inventory mode enabled. Sales are now blocked.');
    }

    public function endInventory()
    {
        $session = InventorySession::current();

        if (!$session) {
            return back()->with('error', 'No active inventory session found.');
        }

        $session->update([
            'ended_by' => auth()->id(),
            'ended_at' => now(),
            'status'   => 'completed',
        ]);

        return back()->with('success', 'Inventory count completed. Sales are now allowed.');
    }
}
