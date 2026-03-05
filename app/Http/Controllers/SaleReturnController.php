<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleReturnRequest;
use App\Models\BankAccount;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Services\SaleService;
use Inertia\Inertia;

class SaleReturnController extends Controller
{
    public function __construct(
        protected SaleService $saleService
    ) {}

    /**
     * Show the return form for a specific sale.
     */
    public function create(Sale $sale)
    {
        if ($sale->status !== 'completed') {
            return back()->with('error', 'Only completed sales can have returns.');
        }

        $sale->load(['items.product', 'user', 'bankAccount']);

        // Calculate already returned quantities per sale item
        $returnedQuantities = SaleReturnItem::whereHas(
            'saleReturn', fn ($q) => $q->where('sale_id', $sale->id)
        )->selectRaw('sale_item_id, SUM(quantity_returned) as total_returned')
            ->groupBy('sale_item_id')
            ->pluck('total_returned', 'sale_item_id')
            ->toArray();

        return Inertia::render('Sales/Return', [
            'sale'               => $sale,
            'returnedQuantities' => $returnedQuantities,
            'bankAccounts'       => BankAccount::where('is_active', true)->get(),
        ]);
    }

    /**
     * Process the return.
     */
    public function store(StoreSaleReturnRequest $request, Sale $sale)
    {
        try {
            $saleReturn = $this->saleService->processReturn(
                $sale,
                $request->validated()['items'],
                $request->only(['type', 'refund_method', 'bank_account_id', 'reason', 'notes']),
                $request->user()
            );

            return redirect()->route('sales.show', $sale)
                ->with('success', "Return #{$saleReturn->return_number} processed successfully.");
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * List all returns.
     */
    public function index()
    {
        $returns = SaleReturn::with(['sale', 'processedBy'])
            ->when(request('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('return_number', 'like', "%{$search}%")
                      ->orWhere('customer_name', 'like', "%{$search}%")
                      ->orWhereHas('sale', fn ($sq) => $sq->where('receipt_number', 'like', "%{$search}%"));
                });
            })
            ->when(request('date_from'), fn ($q, $from) => $q->where('returned_at', '>=', $from))
            ->when(request('date_to'), fn ($q, $to) => $q->where('returned_at', '<=', $to . ' 23:59:59'))
            ->orderByDesc('returned_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Sales/Returns', [
            'returns' => $returns,
            'filters' => request()->only(['search', 'date_from', 'date_to']),
        ]);
    }

    /**
     * Show a specific return.
     */
    public function show(SaleReturn $saleReturn)
    {
        $saleReturn->load(['sale', 'processedBy', 'items', 'bankAccount']);

        return Inertia::render('Sales/ReturnShow', [
            'saleReturn' => $saleReturn,
        ]);
    }
}
