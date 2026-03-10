<?php

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Models\BankAccount;
use App\Models\Bill;
use App\Models\BillItem;
use App\Models\BillPayment;
use App\Models\CashDrawerExpense;
use App\Models\CashDrawerSession;
use App\Models\PurchaseOrder;
use Illuminate\Support\Facades\DB;

class AccountsPayableService
{
    public function __construct(
        protected BankingService $bankingService
    ) {}

    public function generateBillNumber(): string
    {
        $prefix = 'BILL-' . date('Ymd') . '-';
        $last = Bill::where('bill_number', 'like', $prefix . '%')
            ->orderByDesc('bill_number')
            ->value('bill_number');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;
        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }

    public function createBillFromPurchaseOrder(PurchaseOrder $po, ?string $dueDate = null): Bill
    {
        return DB::transaction(function () use ($po, $dueDate) {
            $bill = Bill::create([
                'bill_number'       => $this->generateBillNumber(),
                'supplier_id'       => $po->supplier_id,
                'supplier_name'     => $po->supplier_name,
                'purchase_order_id' => $po->id,
                'category'          => 'purchase_order',
                'subtotal'          => $po->total,
                'tax_amount'        => 0,
                'total_amount'      => $po->total,
                'paid_amount'       => 0,
                'balance'           => $po->total,
                'status'            => 'unpaid',
                'bill_date'         => now()->toDateString(),
                'due_date'          => $dueDate ?? now()->addDays(30)->toDateString(),
                'notes'             => "Auto-generated from PO #{$po->po_number}",
                'created_by'        => auth()->id(),
            ]);

            $po->load('items');
            foreach ($po->items as $item) {
                $bill->items()->create([
                    'description' => $item->product_name,
                    'quantity'    => $item->quantity_received,
                    'unit_price'  => $item->unit_cost,
                    'amount'      => $item->quantity_received * $item->unit_cost,
                ]);
            }

            $po->update(['payment_status' => 'unpaid']);

            return $bill;
        });
    }

    public function createManualBill(array $data, int $userId): Bill
    {
        return DB::transaction(function () use ($data, $userId) {
            $subtotal = collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']);

            $taxAmount = (float) ($data['tax_amount'] ?? 0);
            $totalAmount = $subtotal + $taxAmount;

            $bill = Bill::create([
                'bill_number'   => $this->generateBillNumber(),
                'supplier_id'   => $data['supplier_id'] ?? null,
                'supplier_name' => $data['supplier_name'],
                'category'      => $data['category'],
                'subtotal'      => $subtotal,
                'tax_amount'    => $taxAmount,
                'total_amount'  => $totalAmount,
                'paid_amount'   => 0,
                'balance'       => $totalAmount,
                'status'        => 'unpaid',
                'bill_date'     => $data['bill_date'],
                'due_date'      => $data['due_date'],
                'notes'         => $data['notes'] ?? null,
                'created_by'    => $userId,
            ]);

            foreach ($data['items'] as $item) {
                $bill->items()->create([
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'amount'      => $item['quantity'] * $item['unit_price'],
                ]);
            }

            return $bill;
        });
    }

    public function recordPayment(Bill $bill, array $data, int $paidBy): BillPayment
    {
        return DB::transaction(function () use ($bill, $data, $paidBy) {
            $amount = (float) $data['amount'];
            $method = $data['payment_method'];

            $payment = BillPayment::create([
                'bill_id'                => $bill->id,
                'payment_method'         => $method,
                'amount'                 => $amount,
                'bank_account_id'        => $data['bank_account_id'] ?? null,
                'cash_drawer_session_id' => $data['cash_drawer_session_id'] ?? null,
                'check_number'           => $data['check_number'] ?? null,
                'check_date'             => $data['check_date'] ?? null,
                'reference_number'       => $data['reference_number'] ?? null,
                'paid_by'                => $paidBy,
                'notes'                  => $data['notes'] ?? null,
                'paid_at'                => now(),
            ]);

            // Update bill totals
            $bill->increment('paid_amount', $amount);
            $bill->update([
                'balance' => $bill->total_amount - $bill->paid_amount,
                'status'  => $bill->paid_amount >= $bill->total_amount
                    ? 'paid' : 'partially_paid',
            ]);

            // Cash payment → create CashDrawerExpense
            if ($method === 'cash' && !empty($data['cash_drawer_session_id'])) {
                CashDrawerExpense::create([
                    'cash_drawer_session_id' => $data['cash_drawer_session_id'],
                    'performed_by'           => $paidBy,
                    'category'               => 'bill_payment',
                    'amount'                 => $amount,
                    'description'            => "Bill payment: {$bill->bill_number} – {$bill->supplier_name}",
                ]);
            }

            // Non-cash payment → record bank outflow
            if (in_array($method, ['check', 'bank_transfer', 'online']) && !empty($data['bank_account_id'])) {
                $bankAccount = BankAccount::findOrFail($data['bank_account_id']);
                $this->bankingService->recordOutflow(
                    $bankAccount,
                    $amount,
                    "Bill payment: {$bill->bill_number} – {$bill->supplier_name}",
                    'bill_payment',
                    Bill::class,
                    $bill->id,
                    $paidBy
                );
            }

            // Update PO payment status if linked
            if ($bill->purchase_order_id) {
                $this->updatePOPaymentStatus($bill->purchaseOrder);
            }

            return $payment;
        });
    }

    public function voidBill(Bill $bill): void
    {
        DB::transaction(function () use ($bill) {
            $bill->update(['status' => 'voided']);

            if ($bill->purchase_order_id) {
                $po = $bill->purchaseOrder;
                if ($po) {
                    $po->update(['payment_status' => 'unpaid']);
                }
            }
        });
    }

    public function getAgingReport(): array
    {
        $now = now();
        $rows = Bill::whereIn('status', ['unpaid', 'partially_paid'])
            ->selectRaw("
                supplier_name,
                MAX(supplier_id) as supplier_id,
                SUM(CASE WHEN julianday(due_date) >= julianday(?)
                    THEN balance ELSE 0 END) as current,
                SUM(CASE WHEN julianday(?) - julianday(due_date) BETWEEN 1 AND 30
                    THEN balance ELSE 0 END) as aging_1_30,
                SUM(CASE WHEN julianday(?) - julianday(due_date) BETWEEN 31 AND 60
                    THEN balance ELSE 0 END) as aging_31_60,
                SUM(CASE WHEN julianday(?) - julianday(due_date) BETWEEN 61 AND 90
                    THEN balance ELSE 0 END) as aging_61_90,
                SUM(CASE WHEN julianday(?) - julianday(due_date) > 90
                    THEN balance ELSE 0 END) as aging_over_90,
                SUM(balance) as total
            ", [$now, $now, $now, $now, $now])
            ->groupBy('supplier_name')
            ->orderByDesc('total')
            ->get();

        $suppliers = $rows->map(fn ($r) => [
            'supplier_name' => $r->supplier_name,
            'supplier_id'   => $r->supplier_id,
            'current'       => (float) $r->current,
            'aging_1_30'    => (float) $r->aging_1_30,
            'aging_31_60'   => (float) $r->aging_31_60,
            'aging_61_90'   => (float) $r->aging_61_90,
            'aging_over_90' => (float) $r->aging_over_90,
            'total'         => (float) $r->total,
        ])->values()->toArray();

        return [
            'suppliers' => $suppliers,
            'totals'    => [
                'current'       => array_sum(array_column($suppliers, 'current')),
                'aging_1_30'    => array_sum(array_column($suppliers, 'aging_1_30')),
                'aging_31_60'   => array_sum(array_column($suppliers, 'aging_31_60')),
                'aging_61_90'   => array_sum(array_column($suppliers, 'aging_61_90')),
                'aging_over_90' => array_sum(array_column($suppliers, 'aging_over_90')),
                'total'         => array_sum(array_column($suppliers, 'total')),
            ],
        ];
    }

    public function markOverdueBills(): int
    {
        return Bill::where('status', 'unpaid')
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'overdue']);
    }

    protected function updatePOPaymentStatus(PurchaseOrder $po): void
    {
        $bill = $po->bill;
        if (!$bill) return;

        $status = match ($bill->status) {
            'paid'           => 'paid',
            'partially_paid' => 'partially_paid',
            default          => 'unpaid',
        };

        $po->update(['payment_status' => $status]);
    }
}
