<?php

namespace App\Services;

use App\Models\CustomerDebt;
use App\Models\DebtPayment;
use App\Models\BankAccount;
use App\Models\CashDrawerReceipt;
use App\Models\Sale;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DebtService
{
    public function __construct(
        protected BankingService $bankingService
    ) {}

    public function createDebtFromSale(Sale $sale, ?float $creditAmount = null): CustomerDebt
    {
        $shippingFee = (float) ($sale->shipping?->shipping_fee ?? 0);
        
        // If creditAmount is specified, use that; otherwise use full sale total
        // This supports both full-credit sales and partial credit in multi-payment scenarios
        $totalAmount = $creditAmount ?? ((float) $sale->total + $shippingFee);

        return CustomerDebt::create([
            'customer_name'  => $sale->customer_name,
            'customer_phone' => $sale->customer_phone,
            'sale_id'        => $sale->id,
            'total_amount'   => $totalAmount,
            'paid_amount'    => 0,
            'balance'        => $totalAmount,
            'status'         => 'unpaid',
        ]);
    }

    public function recordPayment(
        string $customerName,
        float $amount,
        ?BankAccount $bankAccount,
        string $paymentMethod,
        int $receivedBy,
        ?int $cashDrawerSessionId = null
    ): Collection {
        return DB::transaction(function () use (
            $customerName, $amount, $bankAccount, $paymentMethod, $receivedBy, $cashDrawerSessionId
        ) {
            $debts = CustomerDebt::where('customer_name', $customerName)
                ->whereIn('status', ['unpaid', 'partial'])
                ->orderBy('created_at', 'asc')
                ->get();

            $remaining = $amount;
            $paymentsCreated = collect();

            foreach ($debts as $debt) {
                if ($remaining <= 0) break;

                $paymentAmount = min($remaining, $debt->balance);

                $payment = DebtPayment::create([
                    'customer_debt_id'       => $debt->id,
                    'bank_account_id'        => $bankAccount?->id,
                    'cash_drawer_session_id' => $cashDrawerSessionId,
                    'payment_method'         => $paymentMethod,
                    'amount'           => $paymentAmount,
                    'received_by'      => $receivedBy,
                    'paid_at'          => now(),
                ]);

                $debt->increment('paid_amount', $paymentAmount);
                $debt->update([
                    'balance' => $debt->total_amount - $debt->paid_amount,
                    'status'  => $debt->paid_amount >= $debt->total_amount
                        ? 'paid' : 'partial',
                ]);

                $remaining -= $paymentAmount;
                $paymentsCreated->push($payment);
            }

            $actualPaid = $amount - $remaining;
            
            // Record bank inflow for online payments
            if ($actualPaid > 0 && $bankAccount !== null) {
                $this->bankingService->recordInflow(
                    $bankAccount,
                    $actualPaid,
                    "Debt payment from {$customerName}",
                    'debt_payment',
                    null, null,
                    $receivedBy
                );
            }

            return $paymentsCreated;
        });
    }

    public function getCustomerSummary(): Collection
    {
        return CustomerDebt::selectRaw("
                customer_name,
                customer_phone,
                SUM(total_amount) as total_debt,
                SUM(paid_amount) as total_paid,
                SUM(balance) as outstanding_balance,
                COUNT(*) as debt_count
            ")
            ->where('status', '!=', 'paid')
            ->groupBy('customer_name', 'customer_phone')
            ->orderByDesc('outstanding_balance')
            ->get();
    }

    public function getAgingReport(): array
    {
        $now = now();
        $rows = CustomerDebt::whereIn('status', ['unpaid', 'partial'])
            ->selectRaw("
                customer_name,
                MAX(customer_phone) as customer_phone,
                SUM(CASE WHEN julianday(?) - julianday(created_at) <= 30
                    THEN balance ELSE 0 END) as current,
                SUM(CASE WHEN julianday(?) - julianday(created_at) BETWEEN 31 AND 60
                    THEN balance ELSE 0 END) as aging_31_60,
                SUM(CASE WHEN julianday(?) - julianday(created_at) BETWEEN 61 AND 90
                    THEN balance ELSE 0 END) as aging_61_90,
                SUM(CASE WHEN julianday(?) - julianday(created_at) > 90
                    THEN balance ELSE 0 END) as aging_over_90,
                SUM(balance) as total
            ", [$now, $now, $now, $now])
            ->groupBy('customer_name')
            ->orderByDesc('total')
            ->get();

        $customers = $rows->map(fn ($r) => [
            'customer_name'  => $r->customer_name,
            'customer_phone' => $r->customer_phone,
            'current'        => (float) $r->current,
            'aging_31_60'    => (float) $r->aging_31_60,
            'aging_61_90'    => (float) $r->aging_61_90,
            'aging_over_90'  => (float) $r->aging_over_90,
            'total'          => (float) $r->total,
        ])->values()->toArray();

        return [
            'summary' => [
                'total_outstanding' => collect($customers)->sum('total'),
                'total_customers'   => count($customers),
                'current'           => collect($customers)->sum('current'),
                'aging_31_60'       => collect($customers)->sum('aging_31_60'),
                'aging_61_90'       => collect($customers)->sum('aging_61_90'),
                'aging_over_90'     => collect($customers)->sum('aging_over_90'),
            ],
            'customers' => $customers,
        ];
    }
}
