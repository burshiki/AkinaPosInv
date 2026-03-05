<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\CustomerDebt;
use App\Models\Product;
use App\Models\Sale;
use App\Services\ReportService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(
        protected ReportService $reportService
    ) {}

    public function index()
    {
        $today = now()->startOfDay();
        $todaySales = Sale::where('status', 'completed')
            ->where('sold_at', '>=', $today)
            ->get();

        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->get();

        $accounts = BankAccount::where('is_active', true)->get();

        $outstandingDebts = CustomerDebt::whereIn('status', ['unpaid', 'partial'])
            ->sum('balance');

        return Inertia::render('Dashboard/Index', [
            'stats' => [
                'today_sales_count' => $todaySales->count(),
                'today_revenue' => $todaySales->sum('total'),
                'total_products' => Product::where('is_active', true)->count(),
                'low_stock_count' => $lowStockProducts->count(),
                'outstanding_debts' => $outstandingDebts,
                'total_bank_balance' => $accounts->sum('balance'),
            ],
            'low_stock_products' => $lowStockProducts,
            'recent_sales' => Sale::with('user')
                ->where('status', 'completed')
                ->orderByDesc('sold_at')
                ->limit(10)
                ->get(),
        ]);
    }
}
