<?php

namespace App\Http\Controllers;

use App\Models\CustomerDebt;
use Inertia\Inertia;

class CustomerDebtController extends Controller
{
    public function index()
    {
        $customers = CustomerDebt::selectRaw("
                customer_name,
                customer_phone,
                SUM(total_amount) as total_debt,
                SUM(paid_amount) as total_paid,
                SUM(balance) as outstanding_balance,
                COUNT(*) as debt_count
            ")
            ->when(request('status'), function ($query, $status) {
                if ($status === 'outstanding') {
                    $query->whereIn('status', ['unpaid', 'partial']);
                } else {
                    $query->where('status', $status);
                }
            }, function ($query) {
                $query->whereIn('status', ['unpaid', 'partial']);
            })
            ->when(request('search'), fn ($q, $s) => $q->where('customer_name', 'like', "%{$s}%"))
            ->groupBy('customer_name', 'customer_phone')
            ->orderByDesc('outstanding_balance')
            ->get();

        return Inertia::render('Debts/Index', [
            'customers'        => $customers,
            'filters'          => request()->only(['search', 'status']),
            'totalOutstanding' => (float) $customers->sum('outstanding_balance'),
        ]);
    }

    public function show(string $customerName)
    {
        $debts = CustomerDebt::where('customer_name', $customerName)
            ->with(['sale', 'payments.bankAccount'])
            ->orderByDesc('created_at')
            ->get();

        $bankAccounts = \App\Models\BankAccount::where('is_active', true)->get();

        return Inertia::render('Debts/Show', [
            'customerName'  => $customerName,
            'debts'         => $debts,
            'bankAccounts'  => $bankAccounts,
            'totalAmount'   => $debts->sum('total_amount'),
            'totalPaid'     => $debts->sum('paid_amount'),
            'totalBalance'  => $debts->sum('balance'),
        ]);
    }
}
