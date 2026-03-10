<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\VoidSaleRequest;
use App\Models\BankAccount;
use App\Models\CashDrawerSession;
use App\Models\Customer;
use App\Models\InventorySession;
use App\Models\Product;
use App\Models\Sale;
use App\Services\SaleService;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    public function index()
    {
        $sales = Sale::with('user')
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('receipt_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%");
                });
            })
            ->when(request('status'), fn ($query, $status) => $query->where('status', $status))
            ->when(request('date_from'), fn ($query, $from) => $query->where('sold_at', '>=', $from))
            ->when(request('date_to'), fn ($query, $to) => $query->where('sold_at', '<=', $to . ' 23:59:59'))
            ->orderByDesc('sold_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => request()->only(['search', 'status', 'date_from', 'date_to']),
        ]);
    }

    public function create()
    {
        // Block POS when inventory count is active
        if (InventorySession::isActive()) {
            return redirect()->route('stock.index')
                ->with('error', 'Sales are blocked while an inventory count is in progress. End the inventory session first.');
        }

        // Require an open cash drawer session before accessing POS
        $drawerSession = CashDrawerSession::forUser(auth()->id())->open()->first();

        if (!$drawerSession) {
            return redirect()->route('cash-drawer.create')
                ->with('error', 'Please open a cash drawer session before using the POS.');
        }

        $completedSale = null;
        if (session('completedSaleId')) {
            $completedSale = Sale::with(['items', 'user'])->find(session('completedSaleId'));
        }

        return Inertia::render('Sales/Create', [
            'products' => Product::where('is_active', true)
                ->where('stock_quantity', '>', 0)
                ->with('category')
                ->orderBy('name')
                ->get(),
            'categories' => \App\Models\Category::where('is_active', true)->orderBy('sort_order')->get(),
            'bankAccounts' => BankAccount::where('is_active', true)->get(),
            'customers' => Customer::where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone', 'email']),
            'drawerSession' => $drawerSession,
            'completedSale' => $completedSale,
        ]);
    }

    public function store(StoreSaleRequest $request)
    {

        try {
            $sale = $this->saleService->createSale(
                $request->validated(),
                $request->user()
            );

            return redirect()->route('sales.create')
                ->with('completedSaleId', $sale->id)
                ->with('success', "Sale #{$sale->receipt_number} completed.");
        } catch (InsufficientStockException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function show(Sale $sale)
    {
        $sale->load(['items', 'user', 'bankAccount']);

        return Inertia::render('Sales/Show', [
            'sale' => $sale,
        ]);
    }

    public function void(VoidSaleRequest $request, Sale $sale)
    {
        if ($sale->status !== 'completed') {
            return back()->with('error', 'Only completed sales can be voided.');
        }

        // Void is only allowed within the same cash drawer session the sale was created in.
        // For prior-session corrections, use the Return flow instead.
        $openSession = CashDrawerSession::open()->latest('opened_at')->first();

        if (!$openSession) {
            return back()->with('error', 'No open cash drawer session. Open a session before voiding.');
        }

        if ($sale->created_at->lt($openSession->opened_at)) {
            return back()->with('error', 'This sale belongs to a previous session and cannot be voided. Use Return instead.');
        }

        try {
            $this->saleService->voidSale($sale, $request->user());
            return back()->with('success', "Sale #{$sale->receipt_number} voided.");
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
