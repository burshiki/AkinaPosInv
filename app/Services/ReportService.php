<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\BankAccountLedger;
use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\CashDrawerExpense;
use App\Models\CashDrawerReceipt;
use App\Models\CashDrawerSession;
use App\Models\CashDrawerTransfer;
use App\Models\CustomerDebt;
use App\Models\DebtPayment;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\StockAdjustment;
use Illuminate\Support\Collection;

class ReportService
{
    public function salesReport(?string $from = null, ?string $to = null): array
    {
        $from = $from ?: now()->startOfMonth()->toDateString();
        $to   = $to   ?: now()->toDateString();

        $completedQuery = Sale::where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to . ' 23:59:59']);
        $sales = $completedQuery->with('items')->get();

        $voidedCount = Sale::where('status', 'voided')
            ->whereBetween('sold_at', [$from, $to . ' 23:59:59'])
            ->count();

        $totalRevenue = $sales->sum('total');
        $saleIds = $sales->pluck('id');
        $totalCost = $saleIds->isNotEmpty()
            ? SaleItem::whereIn('sale_id', $saleIds)
                ->selectRaw('SUM(cost_price * quantity) as total_cost')
                ->value('total_cost') ?? 0
            : 0;
        $totalProfit = $totalRevenue - $totalCost;
        $count = $sales->count();

        // Daily breakdown
        $daily = $sales->groupBy(fn ($s) => substr($s->sold_at, 0, 10))
            ->map(function ($group, $date) {
                $rev  = $group->sum('total');
                $cost = SaleItem::whereIn('sale_id', $group->pluck('id'))
                    ->selectRaw('SUM(cost_price * quantity) as c')
                    ->value('c') ?? 0;
                return [
                    'date'    => $date,
                    'count'   => $group->count(),
                    'revenue' => $rev,
                    'cost'    => $cost,
                    'profit'  => $rev - $cost,
                ];
            })->values()->sortBy('date')->values()->toArray();

        // Top products
        $topProducts = SaleItem::whereIn('sale_id', $saleIds)
            ->selectRaw('product_name, SUM(quantity) as quantity_sold, SUM(quantity * unit_price) as revenue')
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name'          => $r->product_name,
                'quantity_sold' => (int) $r->quantity_sold,
                'revenue'       => (float) $r->revenue,
            ])->toArray();

        return [
            'period'       => ['start' => $from, 'end' => $to],
            'summary'      => [
                'total_sales'   => $count,
                'total_revenue' => $totalRevenue,
                'total_cost'    => $totalCost,
                'total_profit'  => $totalProfit,
                'average_sale'  => $count > 0 ? round($totalRevenue / $count, 2) : 0,
                'voided_count'  => $voidedCount,
            ],
            'daily'        => $daily,
            'top_products' => $topProducts,
        ];
    }

    public function inventoryReport(): array
    {
        $products = Product::with('category')
            ->where('is_active', true)
            ->get();

        $lowStock    = $products->filter(fn ($p) => $p->isLowStock())->values();
        $outOfStock  = $products->filter(fn ($p) => $p->stock_quantity <= 0)->count();

        $mapItem = fn ($p) => [
            'id'            => $p->id,
            'name'          => $p->name,
            'sku'           => $p->sku,
            'category'      => $p->category?->name ?? '—',
            'stock'         => $p->stock_quantity,
            'reorder_level' => $p->reorder_level,
            'cost_price'    => $p->cost_price,
            'selling_price' => $p->selling_price,
            'stock_value'   => $p->cost_price * $p->stock_quantity,
            'is_assembled'  => (bool) $p->is_assembled,
        ];

        return [
            'summary' => [
                'total_products'   => $products->count(),
                'total_stock_value' => $products->sum(fn ($p) => $p->cost_price * $p->stock_quantity),
                'low_stock_count'  => $lowStock->count(),
                'out_of_stock_count' => $outOfStock,
            ],
            'items'          => $products->map($mapItem)->values()->toArray(),
            'low_stock_items' => $lowStock->map($mapItem)->values()->toArray(),
        ];
    }

    public function financialReport(?string $from = null, ?string $to = null): array
    {
        $from = $from ?: now()->startOfMonth()->toDateString();
        $to   = $to   ?: now()->toDateString();

        // Profit & Loss from completed sales
        $salesInPeriod = Sale::where('status', 'completed')
            ->whereBetween('sold_at', [$from, $to . ' 23:59:59'])
            ->with('items')
            ->get();

        $totalRevenue = $salesInPeriod->sum('total');
        $saleIds = $salesInPeriod->pluck('id');
        $totalCost = $saleIds->isNotEmpty()
            ? SaleItem::whereIn('sale_id', $saleIds)
                ->selectRaw('SUM(cost_price * quantity) as total_cost')
                ->value('total_cost') ?? 0
            : 0;
        $grossProfit = $totalRevenue - $totalCost;
        $margin = $totalRevenue > 0 ? round(($grossProfit / $totalRevenue) * 100, 2) : 0;

        // Bank account summaries
        $accounts = BankAccount::where('is_active', true)->get();
        $accountData = $accounts->map(function ($account) use ($from, $to) {
            $baseQuery = $account->ledgerEntries()
                ->whereBetween('transacted_at', [$from, $to . ' 23:59:59']);

            $totalIn  = (clone $baseQuery)->where('type', 'in')->sum('amount');
            $totalOut = (clone $baseQuery)->where('type', 'out')->sum('amount');

            return [
                'id'             => $account->id,
                'name'           => $account->name,
                'bank_name'      => $account->bank_name,
                'balance'        => $account->balance,
                'total_inflows'  => $totalIn,
                'total_outflows' => $totalOut,
            ];
        })->values()->toArray();

        return [
            'period'       => ['start' => $from, 'end' => $to],
            'profit_loss'  => [
                'total_revenue'     => $totalRevenue,
                'total_cost'        => $totalCost,
                'gross_profit'      => $grossProfit,
                'margin_percentage' => $margin,
            ],
            'accounts'      => $accountData,
            'total_balance' => $accounts->sum('balance'),
        ];
    }

    public function debtReport(): array
    {
        $debts = CustomerDebt::whereIn('status', ['unpaid', 'partial'])->get();

        return [
            'total_outstanding' => $debts->sum('balance'),
            'total_customers' => $debts->unique('customer_name')->count(),
            'total_debts' => $debts->count(),
        ];
    }

    public function internalUseReport(?string $from = null, ?string $to = null, ?string $reason = null): array
    {
        $from = $from ?: now()->startOfMonth()->toDateString();
        $to   = $to   ?: now()->toDateString();

        $rows = StockAdjustment::with(['product', 'user'])
            ->whereIn('type', ['internal_use', 'manual'])
            ->where('change_qty', '<', 0)
            ->whereBetween('created_at', [$from, $to . ' 23:59:59'])
            ->when($reason, fn ($q) => $q->where('reason', 'like', "%{$reason}%"))
            ->orderByDesc('created_at')
            ->get();

        $totalQty  = $rows->sum(fn ($r) => abs($r->change_qty));
        $totalCost = $rows->sum(fn ($r) =>
            abs($r->change_qty) * (float) ($r->product?->cost_price ?? 0));

        $byProduct = $rows->groupBy('product_id')
            ->map(function ($group) {
                $p = $group->first()->product;
                $qty  = $group->sum(fn ($r) => abs($r->change_qty));
                $cost = (float) ($p?->cost_price ?? 0);
                return [
                    'id'         => $p?->id,
                    'name'       => $p?->name ?? "Product #{$group->first()->product_id}",
                    'sku'        => $p?->sku,
                    'total_qty'  => $qty,
                    'cost_price' => $cost,
                    'total_cost' => $qty * $cost,
                ];
            })->sortByDesc('total_cost')->values()->toArray();

        $transactions = $rows->map(fn ($r) => [
            'id'           => $r->id,
            'date'         => $r->created_at->toDateTimeString(),
            'product_name' => $r->product?->name ?? "Product #{$r->product_id}",
            'product_sku'  => $r->product?->sku,
            'change_qty'   => $r->change_qty,
            'cost_price'   => (float) ($r->product?->cost_price ?? 0),
            'reason'       => $r->reason,
            'user'         => $r->user?->name,
        ])->values()->toArray();

        return [
            'period'       => ['start' => $from, 'end' => $to],
            'filters'      => ['reason' => $reason],
            'summary'      => [
                'total_records'       => $rows->count(),
                'total_qty_consumed'  => $totalQty,
                'total_cost'          => $totalCost,
            ],
            'by_product'   => $byProduct,
            'transactions' => $transactions,
        ];
    }

    /**
     * End-of-Day Z-Report: comprehensive summary for accounting/shift close.
     * Includes: sales by payment method, voids, returns, tax collected,
     * cash drawer variance, and bank account movements.
     */
    public function zReport(?string $date = null, ?int $sessionId = null): array
    {
        $date = $date ?: now()->toDateString();
        $dayStart = $date . ' 00:00:00';
        $dayEnd = $date . ' 23:59:59';

        // --- Sales summary ---
        $completedSales = Sale::where('status', 'completed')
            ->whereBetween('sold_at', [$dayStart, $dayEnd])
            ->with('items')
            ->get();

        $voidedSales = Sale::where('status', 'voided')
            ->whereBetween('sold_at', [$dayStart, $dayEnd])
            ->get();

        $totalRevenue = $completedSales->sum('total');
        $totalDiscount = $completedSales->sum('discount_amount');
        $totalTaxCollected = $completedSales->sum('tax_amount');

        $saleIds = $completedSales->pluck('id');
        $totalCost = $saleIds->isNotEmpty()
            ? SaleItem::whereIn('sale_id', $saleIds)
                ->selectRaw('SUM(cost_price * quantity) as total_cost')
                ->value('total_cost') ?? 0
            : 0;
        $grossProfit = $totalRevenue - $totalCost;

        // --- Sales by payment method ---
        $salesByMethod = $completedSales->groupBy('payment_method')
            ->map(fn ($group, $method) => [
                'method' => $method,
                'count'  => $group->count(),
                'total'  => $group->sum('total'),
            ])->values()->toArray();

        // --- Voids summary ---
        $voidsSummary = [
            'count' => $voidedSales->count(),
            'total' => $voidedSales->sum('total'),
        ];

        // --- Returns/Refunds ---
        $returns = SaleReturn::whereBetween('returned_at', [$dayStart, $dayEnd])->get();
        $returnsSummary = [
            'count'      => $returns->count(),
            'total'      => $returns->sum('total_refund'),
            'tax_refund' => $returns->sum('tax_refund'),
        ];

        // --- Cash drawer session ---
        $drawerSummary = null;
        $drawerSession = null;
        if ($sessionId) {
            $drawerSession = CashDrawerSession::find($sessionId);
        } else {
            // Get the most recent session that was open on this date
            $drawerSession = CashDrawerSession::where('opened_at', '>=', $dayStart)
                ->where('opened_at', '<=', $dayEnd)
                ->orderByDesc('opened_at')
                ->first();
        }

        if ($drawerSession) {
            $cashSales = Sale::where('cash_drawer_session_id', $drawerSession->id)
                ->where('status', 'completed')
                ->where('payment_method', 'cash')
                ->sum('total');

            $changeGiven = Sale::where('cash_drawer_session_id', $drawerSession->id)
                ->where('status', 'completed')
                ->where('payment_method', 'cash')
                ->sum('change_amount');

            $transfersOut = CashDrawerTransfer::where('cash_drawer_session_id', $drawerSession->id)
                ->where('direction', 'drawer_to_bank')
                ->sum('amount');

            $transfersIn = CashDrawerTransfer::where('cash_drawer_session_id', $drawerSession->id)
                ->where('direction', 'bank_to_drawer')
                ->sum('amount');

            $pettyExpenses = CashDrawerExpense::where('cash_drawer_session_id', $drawerSession->id)
                ->sum('amount');

            $cashDebtPayments = DebtPayment::where('cash_drawer_session_id', $drawerSession->id)
                ->where('payment_method', 'cash')
                ->sum('amount');

            $onlineDebtPayments = DebtPayment::where('cash_drawer_session_id', $drawerSession->id)
                ->where('payment_method', 'online')
                ->sum('amount');

            $expectedCash = (float) $drawerSession->opening_balance
                + (float) $cashSales
                + (float) $cashDebtPayments
                - (float) $changeGiven
                + (float) $transfersIn
                - (float) $transfersOut
                - (float) $pettyExpenses;

            $drawerSummary = [
                'session_id'          => $drawerSession->id,
                'cashier'             => $drawerSession->user?->name ?? 'Unknown',
                'opening_balance'     => (float) $drawerSession->opening_balance,
                'closing_balance'     => $drawerSession->closing_balance !== null ? (float) $drawerSession->closing_balance : null,
                'cash_sales'          => (float) $cashSales,
                'change_given'        => (float) $changeGiven,
                'transfers_out'       => (float) $transfersOut,
                'transfers_in'        => (float) $transfersIn,
                'petty_cash_expenses'  => round((float) $pettyExpenses, 2),
                'cash_debt_payments'   => round((float) $cashDebtPayments, 2),
                'online_debt_payments' => round((float) $onlineDebtPayments, 2),
                'expected_cash'        => round($expectedCash, 2),
                'variance'            => $drawerSession->closing_balance !== null
                    ? round((float) $drawerSession->closing_balance - $expectedCash, 2)
                    : null,
                'status'              => $drawerSession->status,
                'opened_at'           => $drawerSession->opened_at?->toDateTimeString(),
                'closed_at'           => $drawerSession->closed_at?->toDateTimeString(),
            ];
        }

        // --- Bank account movements ---
        $accounts = BankAccount::where('is_active', true)->get();
        $accountMovements = $accounts->map(function ($account) use ($dayStart, $dayEnd) {
            $entries = $account->ledgerEntries()
                ->whereBetween('transacted_at', [$dayStart, $dayEnd]);

            return [
                'id'      => $account->id,
                'name'    => $account->name,
                'type'    => $account->type,
                'inflows' => (float) (clone $entries)->where('type', 'in')->sum('amount'),
                'outflows' => (float) (clone $entries)->where('type', 'out')->sum('amount'),
                'balance' => (float) $account->balance,
            ];
        })->values()->toArray();

        // --- Top 10 products ---
        $topProducts = SaleItem::whereIn('sale_id', $saleIds)
            ->selectRaw('product_name, SUM(quantity) as qty_sold, SUM(subtotal) as revenue')
            ->groupBy('product_name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'name'     => $r->product_name,
                'qty_sold' => (int) $r->qty_sold,
                'revenue'  => (float) $r->revenue,
            ])->toArray();

        return [
            'date' => $date,
            'sales' => [
                'total_transactions' => $completedSales->count(),
                'total_revenue'      => $totalRevenue,
                'total_cost'         => $totalCost,
                'gross_profit'       => $grossProfit,
                'total_discount'     => $totalDiscount,
                'total_tax_collected' => $totalTaxCollected,
                'net_revenue'        => $totalRevenue - $totalTaxCollected,
                'average_sale'       => $completedSales->count() > 0
                    ? round($totalRevenue / $completedSales->count(), 2) : 0,
            ],
            'sales_by_method' => $salesByMethod,
            'voids'           => $voidsSummary,
            'returns'         => $returnsSummary,
            'cash_drawer'     => $drawerSummary,
            'account_movements' => $accountMovements,
            'top_products'    => $topProducts,
        ];
    }

    public function monthlyReport(string $from, string $to): array
    {
        $periodStart = $from . ' 00:00:00';
        $periodEnd   = $to   . ' 23:59:59';

        // ── Assets Snapshot (current/live) ────────────────────────────────────
        // 1. Cash on Hand (Drawer):
        //    The most recent closed session's closing_balance is the physical
        //    cash currently sitting in the drawer.
        $lastClosedSession = CashDrawerSession::where('status', 'closed')
            ->with('user')
            ->orderByDesc('closed_at')
            ->first();
        $cashOnDrawers = [
            'session'     => $lastClosedSession ? [
                'id'               => $lastClosedSession->id,
                'user'             => $lastClosedSession->user?->name ?? 'Unknown',
                'closing_balance'  => (float) $lastClosedSession->closing_balance,
                'closed_at'        => $lastClosedSession->closed_at?->toDateTimeString(),
            ] : null,
            'total' => $lastClosedSession ? (float) $lastClosedSession->closing_balance : 0.0,
        ];

        // 2. Bank Accounts: current balances
        $bankAccounts = BankAccount::where('is_active', true)->get();
        $bankData = [
            'accounts' => $bankAccounts->map(fn ($a) => [
                'id'             => $a->id,
                'name'           => $a->name,
                'bank_name'      => $a->bank_name,
                'account_number' => $a->account_number,
                'balance'        => (float) $a->balance,
            ])->values()->toArray(),
            'total' => (float) $bankAccounts->sum('balance'),
        ];

        // 3. Stock Value: live cost value of all active products
        $stockValue = (float) (Product::where('is_active', true)
            ->selectRaw('SUM(stock_quantity * cost_price) as total')
            ->value('total') ?? 0);

        // 4. Internal Use Cost for the period
        $internalUseRows = StockAdjustment::with(['product'])
            ->whereIn('type', ['internal_use', 'manual'])
            ->where('change_qty', '<', 0)
            ->whereBetween('created_at', [$periodStart, $periodEnd])
            ->get();
        $internalUseCost = (float) $internalUseRows->sum(
            fn ($r) => abs($r->change_qty) * (float) ($r->product?->cost_price ?? 0)
        );

        // 5. Customer Debt: total outstanding balances
        $customerDebt = (float) CustomerDebt::whereIn('status', ['unpaid', 'partial'])
            ->sum('balance');

        $totalAssets = $cashOnDrawers['total'] + $bankData['total'] + $stockValue
            + $internalUseCost + $customerDebt;

        // ── Sales Summary ────────────────────────────────────────────────────
        $completedSales = Sale::where('status', 'completed')
            ->whereBetween('sold_at', [$periodStart, $periodEnd])
            ->with('items')
            ->get();

        $voidedCount = Sale::where('status', 'voided')
            ->whereBetween('sold_at', [$periodStart, $periodEnd])
            ->count();

        $salesRevenue = (float) $completedSales->sum('total');
        $saleIds      = $completedSales->pluck('id');
        $salesCost    = $saleIds->isNotEmpty()
            ? (float) (SaleItem::whereIn('sale_id', $saleIds)
                ->selectRaw('SUM(cost_price * quantity) as total_cost')
                ->value('total_cost') ?? 0)
            : 0;
        $salesCount = $completedSales->count();

        $daily = $completedSales->groupBy(fn ($s) => substr($s->sold_at, 0, 10))
            ->map(function ($group, $date) {
                $rev  = (float) $group->sum('total');
                $cost = (float) (SaleItem::whereIn('sale_id', $group->pluck('id'))
                    ->selectRaw('SUM(cost_price * quantity) as c')
                    ->value('c') ?? 0);
                return [
                    'date'    => $date,
                    'count'   => $group->count(),
                    'revenue' => $rev,
                    'cost'    => $cost,
                    'profit'  => $rev - $cost,
                ];
            })->values()->sortBy('date')->values()->toArray();

        $byPaymentMethod = $completedSales->groupBy('payment_method')
            ->map(fn ($group, $method) => [
                'method' => $method,
                'count'  => $group->count(),
                'total'  => (float) $group->sum('total'),
            ])->values()->toArray();

        $topProducts = $saleIds->isNotEmpty()
            ? SaleItem::whereIn('sale_id', $saleIds)
                ->selectRaw('product_name, SUM(quantity) as quantity_sold, SUM(quantity * unit_price) as revenue')
                ->groupBy('product_name')
                ->orderByDesc('revenue')
                ->limit(10)
                ->get()
                ->map(fn ($r) => [
                    'name'          => $r->product_name,
                    'quantity_sold' => (int) $r->quantity_sold,
                    'revenue'       => (float) $r->revenue,
                ])->toArray()
            : [];

        // ── Income ──────────────────────────────────────────────────────────
        $debtPayments = (float) DebtPayment::whereBetween('paid_at', [$periodStart, $periodEnd])
            ->sum('amount');

        $receiptRows = CashDrawerReceipt::whereBetween('created_at', [$periodStart, $periodEnd])->get();
        $cashReceiptsByCategory = $receiptRows->groupBy('category')
            ->map(fn ($g, $cat) => [
                'category' => $cat ?: 'Uncategorized',
                'total'    => (float) $g->sum('amount'),
            ])->values()->toArray();

        $bankInflowRows = BankAccountLedger::whereBetween('transacted_at', [$periodStart, $periodEnd])
            ->where('type', 'in')
            ->with('bankAccount')
            ->get();
        $bankInflowsByAccount = $bankInflowRows->groupBy('bank_account_id')
            ->map(fn ($g) => [
                'account_name' => $g->first()->bankAccount?->name ?? 'Unknown',
                'total'        => (float) $g->sum('amount'),
            ])->values()->toArray();

        $totalIncome = $salesRevenue + $debtPayments
            + (float) $receiptRows->sum('amount')
            + (float) $bankInflowRows->sum('amount');

        // ── Expenses ────────────────────────────────────────────────────────
        $billPayments = BillPayment::whereBetween('paid_at', [$periodStart, $periodEnd])
            ->with('bill')
            ->get();
        $billsByCategory = $billPayments
            ->groupBy(fn ($bp) => $bp->bill?->category ?? 'Uncategorized')
            ->map(fn ($g, $cat) => [
                'category' => $cat,
                'total'    => (float) $g->sum('amount'),
            ])->values()->toArray();

        $expenseRows = CashDrawerExpense::whereBetween('created_at', [$periodStart, $periodEnd])->get();
        $cashExpensesByCategory = $expenseRows->groupBy('category')
            ->map(fn ($g, $cat) => [
                'category' => $cat ?: 'Uncategorized',
                'total'    => (float) $g->sum('amount'),
            ])->values()->toArray();

        $bankOutflowRows = BankAccountLedger::whereBetween('transacted_at', [$periodStart, $periodEnd])
            ->where('type', 'out')
            ->with('bankAccount')
            ->get();
        $bankOutflowsByAccount = $bankOutflowRows->groupBy('bank_account_id')
            ->map(fn ($g) => [
                'account_name' => $g->first()->bankAccount?->name ?? 'Unknown',
                'total'        => (float) $g->sum('amount'),
            ])->values()->toArray();

        $totalExpenses = (float) $billPayments->sum('amount')
            + (float) $expenseRows->sum('amount')
            + (float) $bankOutflowRows->sum('amount')
            + $internalUseCost;

        // ── Accounts Payable (unpaid/partial bills) ─────────────────────────
        $unpaidBills = Bill::whereIn('status', ['unpaid', 'partial'])
            ->orderBy('due_date')
            ->get();
        $apBySupplier = $unpaidBills->groupBy('supplier_name')
            ->map(fn ($g, $name) => [
                'supplier' => $name ?: 'Unknown',
                'count'    => $g->count(),
                'total'    => (float) $g->sum('balance'),
            ])->values()->toArray();
        $totalAP = (float) $unpaidBills->sum('balance');

        return [
            'period'  => ['start' => $from, 'end' => $to],
            'assets'  => [
                'cash_on_drawers'   => $cashOnDrawers,
                'bank_accounts'     => $bankData,
                'stock_value'       => $stockValue,
                'internal_use_cost' => $internalUseCost,
                'customer_debt'     => $customerDebt,
                'total_assets'      => $totalAssets,
            ],
            'sales' => [
                'summary' => [
                    'total_sales'   => $salesCount,
                    'total_revenue' => $salesRevenue,
                    'total_cost'    => $salesCost,
                    'total_profit'  => $salesRevenue - $salesCost,
                    'average_sale'  => $salesCount > 0 ? round($salesRevenue / $salesCount, 2) : 0,
                    'voided_count'  => $voidedCount,
                ],
                'daily'             => $daily,
                'by_payment_method' => $byPaymentMethod,
                'top_products'      => $topProducts,
            ],
            'income' => [
                'sales_revenue' => $salesRevenue,
                'debt_payments' => $debtPayments,
                'cash_receipts' => [
                    'by_category' => $cashReceiptsByCategory,
                    'total'       => (float) $receiptRows->sum('amount'),
                ],
                'bank_inflows' => [
                    'by_account' => $bankInflowsByAccount,
                    'total'      => (float) $bankInflowRows->sum('amount'),
                ],
                'total' => $totalIncome,
            ],
            'expenses' => [
                'bills_paid' => [
                    'by_category' => $billsByCategory,
                    'total'       => (float) $billPayments->sum('amount'),
                ],
                'cash_expenses' => [
                    'by_category' => $cashExpensesByCategory,
                    'total'       => (float) $expenseRows->sum('amount'),
                ],
                'bank_outflows' => [
                    'by_account' => $bankOutflowsByAccount,
                    'total'      => (float) $bankOutflowRows->sum('amount'),
                ],
                'internal_use_cost' => $internalUseCost,
                'total'             => $totalExpenses,
            ],
            'net_income'   => $totalIncome - $totalExpenses,
            'internal_use' => $this->internalUseReport($from, $to),
            'accounts_payable' => [
                'bills' => $unpaidBills->map(fn ($b) => [
                    'id'            => $b->id,
                    'bill_number'   => $b->bill_number,
                    'supplier_name' => $b->supplier_name,
                    'category'      => $b->category,
                    'total_amount'  => (float) $b->total_amount,
                    'paid_amount'   => (float) $b->paid_amount,
                    'balance'       => (float) $b->balance,
                    'status'        => $b->status,
                    'bill_date'     => $b->bill_date?->toDateString(),
                    'due_date'      => $b->due_date?->toDateString(),
                ])->values()->toArray(),
                'by_supplier' => $apBySupplier,
                'total'       => $totalAP,
                'count'       => $unpaidBills->count(),
            ],
        ];
    }
}
