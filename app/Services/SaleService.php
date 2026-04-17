<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Jobs\LowStockAlertJob;
use App\Models\BankAccount;
use App\Models\CashDrawerExpense;
use App\Models\CashDrawerReceipt;
use App\Models\CashDrawerSession;
use App\Models\SaleShipping;
use App\Models\CustomerDebt;
use App\Models\Customer;
use App\Models\InventoryLot;
use App\Models\InventorySession;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\SaleReturn;
use App\Models\SaleReturnItem;
use App\Models\StockAdjustment;
use App\Models\User;
use App\Models\Warranty;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(
        protected BankingService $bankingService,
        protected DebtService $debtService
    ) {}

    public function createSale(array $validated, User $cashier): Sale
    {
        if (InventorySession::isActive()) {
            throw new \RuntimeException('Sales are disabled during an active inventory count.');
        }

        return DB::transaction(function () use ($validated, $cashier) {
            $receiptNumber = $this->generateReceiptNumber();
            $officialReceiptNumber = $this->generateOfficialReceiptNumber();

            // Calculate item subtotals (after per-item discounts)
            $itemsWithTax = [];
            $subtotal = 0;
            $totalTax = 0;

            foreach ($validated['items'] as $item) {
                // product_id can be null for service lines (e.g. repair fee)
                $product = !empty($item['product_id']) ? Product::find($item['product_id']) : null;
                $lineSubtotal = $item['quantity'] * $item['unit_price'];

                // Per-item discount
                $itemDiscountAmt = 0;
                $itemDiscountType = $item['discount_type'] ?? 'amount';
                $itemDiscountVal = (float) ($item['discount_amount'] ?? 0);
                if ($itemDiscountVal > 0) {
                    $itemDiscountAmt = $itemDiscountType === 'percent'
                        ? round($lineSubtotal * ($itemDiscountVal / 100), 2)
                        : min($itemDiscountVal, $lineSubtotal);
                }

                $discountedSubtotal = $lineSubtotal - $itemDiscountAmt;
                $taxRate = ($product && !$product->is_vat_exempt) ? (float) $product->tax_rate : 0;
                $itemTax = $taxRate > 0 ? round($discountedSubtotal * ($taxRate / 100), 2) : 0;

                $subtotal += $lineSubtotal;
                $totalTax += $itemTax;

                $itemsWithTax[] = array_merge($item, [
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'item_discount_amount' => $itemDiscountAmt,
                    'item_discount_type' => $itemDiscountType,
                ]);
            }

            // Sale-level discount (supports percent or amount)
            $discountType = $validated['discount_type'] ?? 'amount';
            $discountValue = (float) ($validated['discount_amount'] ?? 0);
            $saleDiscount = $discountType === 'percent'
                ? round($subtotal * ($discountValue / 100), 2)
                : $discountValue;

            $total = $subtotal - $saleDiscount + $totalTax;

            // Get active cash drawer session for this user
            $drawerSession = CashDrawerSession::forUser($cashier->id)->open()->first();

            $sale = Sale::create([
                'receipt_number'          => $receiptNumber,
                'official_receipt_number' => $officialReceiptNumber,
                'user_id'                 => $cashier->id,
                'customer_id'             => $validated['customer_id'] ?? null,
                'customer_name'           => $validated['customer_name'] ?? null,
                'customer_phone'          => $validated['customer_phone'] ?? null,
                'payment_method'          => $validated['payment_method'],
                'bank_account_id'         => $validated['bank_account_id'] ?? null,
                'cash_drawer_session_id'  => $drawerSession?->id,
                'subtotal'                => $subtotal,
                'discount_amount'         => $saleDiscount,
                'discount_type'           => $discountType,
                'tax_amount'              => $totalTax,
                'total'                   => $total,
                'amount_tendered'         => $validated['amount_tendered'] ?? null,
                'change_amount'           => isset($validated['amount_tendered'])
                    ? max(0, $validated['amount_tendered'] - $total) : null,
                'status'                  => 'completed',
                'sold_at'                 => now(),
            ]);

            $lowStockProductIds = [];

            $isRepairSale = !empty($validated['repair_job_id']);

            foreach ($itemsWithTax as $item) {
                // Service line (repair fee, etc.) — no product, no stock deduction
                if (empty($item['product_id'])) {
                    SaleItem::create([
                        'sale_id'         => $sale->id,
                        'product_id'      => null,
                        'product_name'    => $item['product_name'] ?? 'Service',
                        'product_sku'     => null,
                        'quantity'        => $item['quantity'],
                        'unit_price'      => $item['unit_price'],
                        'cost_price'      => 0,
                        'tax_rate'        => $item['tax_rate'],
                        'tax_amount'      => $item['tax_amount'],
                        'subtotal'        => $item['quantity'] * $item['unit_price'],
                        'discount_amount' => $item['item_discount_amount'],
                        'discount_type'   => $item['item_discount_type'],
                    ]);
                    continue;
                }

                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity'] && !$isRepairSale) {
                    throw new InsufficientStockException(
                        "Insufficient stock for {$product->name}"
                    );
                }

                // FIFO: consume from oldest lots first
                $this->consumeInventoryLots($product->id, $item['quantity']);

                $costPrice = $product->cost_price;

                $saleItem = SaleItem::create([
                    'sale_id'         => $sale->id,
                    'product_id'      => $product->id,
                    'product_name'    => $product->name,
                    'product_sku'     => $product->sku ?? null,
                    'quantity'        => $item['quantity'],
                    'unit_price'      => $item['unit_price'],
                    'cost_price'      => $costPrice,
                    'tax_rate'        => $item['tax_rate'],
                    'tax_amount'      => $item['tax_amount'],
                    'subtotal'        => $item['quantity'] * $item['unit_price'],
                    'discount_amount' => $item['item_discount_amount'],
                    'discount_type'   => $item['item_discount_type'],
                ]);

                $beforeQty = $product->stock_quantity;
                $product->decrement('stock_quantity', $item['quantity']);

                StockAdjustment::create([
                    'product_id'  => $product->id,
                    'user_id'     => $cashier->id,
                    'type'        => 'sale',
                    'before_qty'  => $beforeQty,
                    'change_qty'  => -$item['quantity'],
                    'after_qty'   => $beforeQty - $item['quantity'],
                    'reason'      => "Sale #{$receiptNumber}",
                ]);

                // Check low stock for alert
                if ($product->fresh()->isLowStock()) {
                    $lowStockProductIds[] = $product->id;
                }

                // Auto-create one warranty record per unit sold
                if ($product->has_warranty && $product->warranty_months) {
                    for ($unit = 0; $unit < $item['quantity']; $unit++) {
                        Warranty::create([
                            'sale_id'         => $sale->id,
                            'sale_item_id'    => $saleItem->id,
                            'product_id'      => $product->id,
                            'receipt_number'  => $receiptNumber,
                            'customer_name'   => $validated['customer_name'] ?? null,
                            'warranty_months' => $product->warranty_months,
                            'status'          => 'pending_serial',
                        ]);
                    }
                }
            }

            // Create shipping record before debt creation so the fee is included in the debt total
            if (!empty($validated['has_shipping'])) {
                $fee = (isset($validated['shipping_fee']) && $validated['shipping_fee'] !== '' && $validated['shipping_fee'] !== null)
                    ? (float) $validated['shipping_fee']
                    : null;
                SaleShipping::create([
                    'sale_id'          => $sale->id,
                    'shipping_fee'     => $fee,
                    'fee_status'       => $fee !== null ? 'confirmed' : 'pending',
                    'notes'            => $validated['shipping_notes'] ?? null,
                ]);
            }

            if ($validated['payment_method'] === 'online') {
                $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
                $this->bankingService->recordInflow(
                    $bankAccount, $total,
                    "Sale #{$receiptNumber}", 'sale',
                    Sale::class, $sale->id, $cashier->id
                );
            } elseif ($validated['payment_method'] === 'credit') {
                $this->debtService->createDebtFromSale($sale->load('shipping'));
            } elseif ($validated['payment_method'] === 'multi') {
                // Handle multi-payment
                $creditAmount = 0;
                foreach ($validated['payments'] as $payment) {
                    $paymentMethod = $payment['method'];
                    $paymentAmount = (float) $payment['amount'];
                    $bankAccountId = $payment['bank_account_id'] ?? null;
                    $referenceNumber = $payment['reference_number'] ?? null;

                    // Track credit amount for later debt creation
                    if ($paymentMethod === 'credit') {
                        $creditAmount += $paymentAmount;
                    }

                    // Record payment in sale_payments table
                    SalePayment::create([
                        'sale_id'               => $sale->id,
                        'payment_method'        => $paymentMethod,
                        'amount'                => $paymentAmount,
                        'bank_account_id'       => $bankAccountId,
                        'cash_drawer_session_id' => $paymentMethod === 'cash' ? $drawerSession?->id : null,
                        'reference_number'      => $referenceNumber,
                        'paid_at'               => now(),
                    ]);

                    // Record in cash drawer if cash payment
                    if ($paymentMethod === 'cash' && $drawerSession) {
                        CashDrawerReceipt::create([
                            'cash_drawer_session_id' => $drawerSession->id,
                            'performed_by'           => $cashier->id,
                            'category'               => 'sale',
                            'description'            => "Sale #{$receiptNumber}",
                            'amount'                 => $paymentAmount,
                        ]);
                    }

                    // Record in bank account if online payment
                    if ($paymentMethod === 'online' && $bankAccountId) {
                        $bankAccount = BankAccount::find($bankAccountId);
                        if ($bankAccount) {
                            $this->bankingService->recordInflow(
                                $bankAccount, $paymentAmount,
                                "Sale #{$receiptNumber} - {$paymentMethod}", 'sale',
                                Sale::class, $sale->id, $cashier->id
                            );
                        }
                    }
                }

                // Create debt for credit portion
                if ($creditAmount > 0) {
                    $this->debtService->createDebtFromSale($sale->load('shipping'), $creditAmount);
                }
            }

            // Award loyalty points (1 point per peso spent)
            if ($sale->customer_id) {
                $customer = Customer::find($sale->customer_id);
                if ($customer) {
                    $points = (int) floor($total);
                    if ($points > 0) {
                        $customer->addLoyaltyPoints($points, $sale->id, "Sale #{$receiptNumber}");
                    }
                }
            }

            // Dispatch low stock alerts after transaction
            foreach ($lowStockProductIds as $productId) {
                LowStockAlertJob::dispatch($productId);
            }

            // Link to repair job and mark as claimed
            if (!empty($validated['repair_job_id'])) {
                \App\Models\RepairJob::where('id', $validated['repair_job_id'])
                    ->whereIn('status', ['pending', 'in_progress', 'done'])
                    ->update([
                        'sale_id'    => $sale->id,
                        'status'     => 'claimed',
                        'claimed_at' => now(),
                    ]);
            }

            return $sale->load('items');
        });
    }

    /**
     * Consume inventory lots in FIFO order.
     */
    private function consumeInventoryLots(int $productId, int $quantity): void
    {
        $lots = InventoryLot::fifo($productId)->get();
        $remaining = $quantity;

        foreach ($lots as $lot) {
            if ($remaining <= 0) break;

            $consume = min($remaining, $lot->quantity_remaining);
            $lot->decrement('quantity_remaining', $consume);
            $remaining -= $consume;
        }
    }

    public function voidSale(Sale $sale, User $user): Sale
    {
        return DB::transaction(function () use ($sale, $user) {
            foreach ($sale->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $beforeQty = $product->stock_quantity;
                    $product->increment('stock_quantity', $item->quantity);

                    StockAdjustment::create([
                        'product_id' => $product->id,
                        'user_id'    => $user->id,
                        'type'       => 'void',
                        'before_qty' => $beforeQty,
                        'change_qty' => $item->quantity,
                        'after_qty'  => $beforeQty + $item->quantity,
                        'reason'     => "Void Sale #{$sale->receipt_number}",
                    ]);
                }
            }

            if ($sale->bank_account_id && $sale->payment_method === 'online') {
                $bankAccount = BankAccount::find($sale->bank_account_id);
                if ($bankAccount) {
                    $this->bankingService->recordOutflow(
                        $bankAccount, $sale->total,
                        "Void Sale #{$sale->receipt_number}", 'adjustment',
                        Sale::class, $sale->id, $user->id
                    );
                }
            } elseif ($sale->payment_method === 'multi') {
                // Reverse multi-payments
                $salePayments = SalePayment::where('sale_id', $sale->id)->get();
                foreach ($salePayments as $payment) {
                    if ($payment->payment_method === 'online' && $payment->bank_account_id) {
                        $bankAccount = BankAccount::find($payment->bank_account_id);
                        if ($bankAccount) {
                            $this->bankingService->recordOutflow(
                                $bankAccount, $payment->amount,
                                "Void Sale #{$sale->receipt_number}", 'adjustment',
                                Sale::class, $sale->id, $user->id
                            );
                        }
                    }
                }
            }

            // Cancel any unpaid/partial debt created for this sale (credit or multi-payment credit)
            if ($sale->payment_method === 'credit' || $sale->payment_method === 'multi') {
                CustomerDebt::where('sale_id', $sale->id)
                    ->whereIn('status', ['unpaid', 'partial'])
                    ->update(['status' => 'cancelled', 'balance' => 0]);
            }

            // Remove cash drawer receipts created from this sale
            // This handles both regular cash sales and multi-payment cash components
            CashDrawerReceipt::where('category', 'sale')
                ->where('description', "Sale #{$sale->receipt_number}")
                ->delete();

            $sale->update(['status' => 'voided']);

            return $sale->fresh();
        });
    }

    public function generateReceiptNumber(): string
    {
        $date = now()->format('Ymd');
        $lastSale = Sale::where('receipt_number', 'like', "RCP-{$date}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($lastSale) {
            $parts = explode('-', $lastSale->receipt_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('RCP-%s-%04d', $date, $sequence);
    }

    public function generateOfficialReceiptNumber(): string
    {
        $date = now()->format('Ymd');
        $lastOR = Sale::where('official_receipt_number', 'like', "OR-{$date}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($lastOR) {
            $parts = explode('-', $lastOR->official_receipt_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('OR-%s-%04d', $date, $sequence);
    }

    public function generateReturnNumber(): string
    {
        $date = now()->format('Ymd');
        $last = SaleReturn::where('return_number', 'like', "RTN-{$date}-%")
            ->orderByDesc('id')
            ->first();

        $sequence = 1;
        if ($last) {
            $parts = explode('-', $last->return_number);
            $sequence = (int) end($parts) + 1;
        }

        return sprintf('RTN-%s-%04d', $date, $sequence);
    }

    public function processReturn(Sale $sale, array $items, array $returnData, User $user): SaleReturn
    {
        if ($sale->status !== 'completed') {
            throw new \RuntimeException('Only completed sales can have returns.');
        }

        return DB::transaction(function () use ($sale, $items, $returnData, $user) {
            $returnNumber = $this->generateReturnNumber();
            $totalRefund = 0;
            $totalTaxRefund = 0;

            $saleReturn = SaleReturn::create([
                'return_number'   => $returnNumber,
                'sale_id'         => $sale->id,
                'processed_by'    => $user->id,
                'customer_id'     => $sale->customer_id,
                'customer_name'   => $sale->customer_name,
                'type'            => $returnData['type'] ?? 'refund',
                'refund_method'   => $returnData['refund_method'] ?? null,
                'bank_account_id' => $returnData['bank_account_id'] ?? null,
                'total_refund'    => 0,
                'tax_refund'      => 0,
                'reason'          => $returnData['reason'] ?? null,
                'notes'           => $returnData['notes'] ?? null,
                'returned_at'     => now(),
            ]);

            foreach ($items as $returnItem) {
                $saleItem = SaleItem::findOrFail($returnItem['sale_item_id']);

                $previouslyReturned = SaleReturnItem::where('sale_item_id', $saleItem->id)
                    ->sum('quantity_returned');
                $maxReturnable = $saleItem->quantity - $previouslyReturned;

                $qtyReturn = min((int) $returnItem['quantity_returned'], $maxReturnable);
                if ($qtyReturn <= 0) continue;

                $refundAmount = $qtyReturn * (float) $saleItem->unit_price;
                $taxRefund = (float) $saleItem->tax_rate > 0
                    ? round($refundAmount * ((float) $saleItem->tax_rate / 100), 2)
                    : 0;

                $totalRefund += $refundAmount;
                $totalTaxRefund += $taxRefund;

                SaleReturnItem::create([
                    'sale_return_id'   => $saleReturn->id,
                    'sale_item_id'     => $saleItem->id,
                    'product_id'       => $saleItem->product_id,
                    'product_name'     => $saleItem->product_name,
                    'product_sku'      => $saleItem->product_sku,
                    'quantity_returned' => $qtyReturn,
                    'unit_price'       => $saleItem->unit_price,
                    'cost_price'       => $saleItem->cost_price,
                    'refund_amount'    => $refundAmount,
                    'restock'          => $returnItem['restock'] ?? true,
                ]);

                if ($returnItem['restock'] ?? true) {
                    $product = Product::find($saleItem->product_id);
                    if ($product) {
                        $beforeQty = $product->stock_quantity;
                        $product->increment('stock_quantity', $qtyReturn);

                        StockAdjustment::create([
                            'product_id' => $product->id,
                            'user_id'    => $user->id,
                            'type'       => 'return',
                            'before_qty' => $beforeQty,
                            'change_qty' => $qtyReturn,
                            'after_qty'  => $beforeQty + $qtyReturn,
                            'reason'     => "Return #{$returnNumber} from Sale #{$sale->receipt_number}",
                        ]);
                    }
                }
            }

            $saleReturn->update([
                'total_refund' => $totalRefund + $totalTaxRefund,
                'tax_refund'   => $totalTaxRefund,
            ]);

            if ($returnData['type'] === 'refund' && $totalRefund > 0) {
                $refundTotal = $totalRefund + $totalTaxRefund;

                if (($returnData['refund_method'] ?? '') === 'cash') {
                    $drawerSession = CashDrawerSession::forUser($user->id)->open()->first();
                    if ($drawerSession) {
                        CashDrawerExpense::create([
                            'cash_drawer_session_id' => $drawerSession->id,
                            'performed_by'           => $user->id,
                            'category'               => 'refund',
                            'amount'                 => $refundTotal,
                            'description'            => "Cash refund #{$returnNumber} for Sale #{$sale->receipt_number}",
                        ]);
                    }
                }

                if (($returnData['refund_method'] ?? '') === 'online' && !empty($returnData['bank_account_id'])) {
                    $bankAccount = BankAccount::findOrFail($returnData['bank_account_id']);
                    $this->bankingService->recordOutflow(
                        $bankAccount, $refundTotal,
                        "Refund #{$returnNumber} for Sale #{$sale->receipt_number}", 'adjustment',
                        SaleReturn::class, $saleReturn->id, $user->id
                    );
                }
            }

            $totalItemsSold = $sale->items->sum('quantity');
            $totalItemsReturned = SaleReturnItem::whereHas('saleReturn', fn ($q) => $q->where('sale_id', $sale->id))
                ->sum('quantity_returned');

            if ($totalItemsReturned >= $totalItemsSold) {
                $sale->update(['status' => 'refunded']);
            }

            return $saleReturn->load('items');
        });
    }
}
