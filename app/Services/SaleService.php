<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\BankAccount;
use App\Models\CashDrawerSession;
use App\Models\InventorySession;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
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

            $subtotal = collect($validated['items'])->sum(
                fn ($item) => $item['quantity'] * $item['unit_price']
            );
            $discount = $validated['discount_amount'] ?? 0;

            // Calculate tax for each item and get total tax
            $totalTax = 0;
            $itemsWithTax = [];
            foreach ($validated['items'] as $item) {
                $product = Product::find($item['product_id']);
                $itemSubtotal = $item['quantity'] * $item['unit_price'];
                $taxRate = ($product && !$product->is_vat_exempt) ? (float) $product->tax_rate : 0;
                $itemTax = $taxRate > 0 ? round($itemSubtotal * ($taxRate / 100), 2) : 0;
                $totalTax += $itemTax;
                $itemsWithTax[] = array_merge($item, [
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                ]);
            }

            $total = $subtotal - $discount + $totalTax;

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
                'discount_amount'         => $discount,
                'tax_amount'              => $totalTax,
                'total'                   => $total,
                'amount_tendered'         => $validated['amount_tendered'] ?? null,
                'change_amount'           => isset($validated['amount_tendered'])
                    ? max(0, $validated['amount_tendered'] - $total) : null,
                'status'                  => 'completed',
                'sold_at'                 => now(),
            ]);

            foreach ($itemsWithTax as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity']) {
                    throw new InsufficientStockException(
                        "Insufficient stock for {$product->name}"
                    );
                }

                $saleItem = SaleItem::create([
                    'sale_id'      => $sale->id,
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'product_sku'  => $product->sku ?? null,
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $item['unit_price'],
                    'cost_price'   => $product->cost_price,
                    'tax_rate'     => $item['tax_rate'],
                    'tax_amount'   => $item['tax_amount'],
                    'subtotal'     => $item['quantity'] * $item['unit_price'],
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

                // Auto-create warranty record if product has warranty
                if ($product->has_warranty && $product->warranty_months) {
                    Warranty::create([
                        'sale_id'         => $sale->id,
                        'sale_item_id'    => $saleItem->id,
                        'product_id'      => $product->id,
                        'receipt_number'  => $receiptNumber,
                        'customer_name'   => $validated['customer_name'] ?? null,
                        'warranty_months' => $product->warranty_months,
                        'status'          => 'pending',
                    ]);
                }
            }

            if ($validated['payment_method'] === 'online') {
                $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
                $this->bankingService->recordInflow(
                    $bankAccount, $total,
                    "Sale #{$receiptNumber}", 'sale',
                    Sale::class, $sale->id, $cashier->id
                );
            } elseif ($validated['payment_method'] === 'credit') {
                $this->debtService->createDebtFromSale($sale);
            }

            return $sale->load('items');
        });
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
            }

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

    /**
     * Generate a BIR-compliant Official Receipt number.
     * Sequential numbering: OR-YYYYMMDD-NNNN
     */
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

    /**
     * Generate a return/refund number.
     */
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

    /**
     * Process item-level return/refund for a completed sale.
     *
     * @param Sale $sale The original sale
     * @param array $items Array of [{sale_item_id, quantity_returned, restock}]
     * @param array $returnData {type: refund|exchange, refund_method, bank_account_id, reason, notes}
     * @param User $user The user processing the return
     */
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
                'total_refund'    => 0, // will update after calculating
                'tax_refund'      => 0,
                'reason'          => $returnData['reason'] ?? null,
                'notes'           => $returnData['notes'] ?? null,
                'returned_at'     => now(),
            ]);

            foreach ($items as $returnItem) {
                $saleItem = SaleItem::findOrFail($returnItem['sale_item_id']);

                // Validate quantity doesn't exceed what was sold (minus any previous returns)
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

                // Restock if requested
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

            // Process refund payment
            if ($returnData['type'] === 'refund' && $totalRefund > 0) {
                $refundTotal = $totalRefund + $totalTaxRefund;

                if (($returnData['refund_method'] ?? '') === 'online' && !empty($returnData['bank_account_id'])) {
                    $bankAccount = BankAccount::findOrFail($returnData['bank_account_id']);
                    $this->bankingService->recordOutflow(
                        $bankAccount, $refundTotal,
                        "Refund #{$returnNumber} for Sale #{$sale->receipt_number}", 'adjustment',
                        SaleReturn::class, $saleReturn->id, $user->id
                    );
                }
            }

            // Check if entire sale has been returned — update sale status
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
