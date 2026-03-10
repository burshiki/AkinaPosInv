<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\CashDrawerSession;
use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryLot;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockAdjustment;
use App\Models\User;
use App\Models\Warranty;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaleServiceTest extends TestCase
{
    use RefreshDatabase;

    private SaleService $saleService;
    private User $cashier;

    protected function setUp(): void
    {
        parent::setUp();
        $this->saleService = app(SaleService::class);
        $this->cashier = User::factory()->create();
    }

    private function createProduct(array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'selling_price' => 100.00,
            'cost_price' => 50.00,
            'stock_quantity' => 50,
            'tax_rate' => 12.00,
            'is_vat_exempt' => false,
        ], $overrides));
    }

    private function createInventoryLot(Product $product, int $qty): InventoryLot
    {
        return InventoryLot::create([
            'product_id' => $product->id,
            'cost_price' => $product->cost_price,
            'quantity_received' => $qty,
            'quantity_remaining' => $qty,
            'received_at' => now(),
        ]);
    }

    private function buildSaleData(array $items, array $overrides = []): array
    {
        return array_merge([
            'payment_method' => 'cash',
            'discount_amount' => 0,
            'discount_type' => 'amount',
            'amount_tendered' => 10000,
            'items' => $items,
        ], $overrides);
    }

    // ── Basic Cash Sale ──

    public function test_create_cash_sale_with_single_item(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertEquals('completed', $sale->status);
        $this->assertEquals(200.00, (float) $sale->subtotal);
        $this->assertEquals(24.00, (float) $sale->tax_amount); // 200 * 12%
        $this->assertEquals(224.00, (float) $sale->total);      // 200 + 24
        $this->assertStringStartsWith('RCP-', $sale->receipt_number);
        $this->assertStringStartsWith('OR-', $sale->official_receipt_number);
        $this->assertCount(1, $sale->items);

        // Stock was deducted
        $this->assertEquals(48, $product->fresh()->stock_quantity);
    }

    public function test_create_sale_with_multiple_items(): void
    {
        $product1 = $this->createProduct(['selling_price' => 100.00]);
        $product2 = $this->createProduct(['selling_price' => 200.00]);
        $this->createInventoryLot($product1, 50);
        $this->createInventoryLot($product2, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product1->id, 'quantity' => 3, 'unit_price' => 100.00],
            ['product_id' => $product2->id, 'quantity' => 1, 'unit_price' => 200.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertCount(2, $sale->items);
        $this->assertEquals(500.00, (float) $sale->subtotal); // 300 + 200
        $this->assertEquals(47, $product1->fresh()->stock_quantity);
        $this->assertEquals(49, $product2->fresh()->stock_quantity);
    }

    // ── Discount Tests ──

    public function test_sale_level_flat_discount(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            ['discount_amount' => 10, 'discount_type' => 'amount']
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertEquals(10.00, (float) $sale->discount_amount);
        $this->assertEquals('amount', $sale->discount_type);
        // total = subtotal(100) - discount(10) + tax(12) = 102
        $this->assertEquals(102.00, (float) $sale->total);
    }

    public function test_sale_level_percent_discount(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            ['discount_amount' => 20, 'discount_type' => 'percent']
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        // 20% of 100 = 20
        $this->assertEquals(20.00, (float) $sale->discount_amount);
        $this->assertEquals('percent', $sale->discount_type);
        // total = 100 - 20 + 12 = 92
        $this->assertEquals(92.00, (float) $sale->total);
    }

    public function test_per_item_percent_discount(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            [
                'product_id' => $product->id,
                'quantity' => 2,
                'unit_price' => 100.00,
                'discount_amount' => 10,
                'discount_type' => 'percent',
            ],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        // item subtotal = 200, item discount = 10% of 200 = 20
        // tax on discounted = 180 * 12% = 21.6
        $this->assertEquals(200.00, (float) $sale->subtotal);
        $this->assertEquals(21.60, (float) $sale->tax_amount);
        // total = 200 - 0 (no sale-level discount) + 21.60 = 221.60
        $this->assertEquals(221.60, (float) $sale->total);

        // SaleItem should store the per-item discount
        $saleItem = $sale->items->first();
        $this->assertEquals(20.00, (float) $saleItem->discount_amount);
        $this->assertEquals('percent', $saleItem->discount_type);
    }

    // ── VAT Exempt ──

    public function test_vat_exempt_product_has_zero_tax(): void
    {
        $product = $this->createProduct(['is_vat_exempt' => true, 'tax_rate' => 12.00]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertEquals(0.00, (float) $sale->tax_amount);
        $this->assertEquals(100.00, (float) $sale->total);
    }

    // ── Stock & FIFO ──

    public function test_stock_deduction_creates_adjustment_record(): void
    {
        $product = $this->createProduct(['stock_quantity' => 20]);
        $this->createInventoryLot($product, 20);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100.00],
        ]);

        $this->saleService->createSale($data, $this->cashier);

        $adjustment = StockAdjustment::where('product_id', $product->id)->first();
        $this->assertNotNull($adjustment);
        $this->assertEquals('sale', $adjustment->type);
        $this->assertEquals(20, $adjustment->before_qty);
        $this->assertEquals(-5, $adjustment->change_qty);
        $this->assertEquals(15, $adjustment->after_qty);
    }

    public function test_fifo_lot_consumption(): void
    {
        $product = $this->createProduct(['stock_quantity' => 15]);

        $lot1 = InventoryLot::create([
            'product_id' => $product->id,
            'cost_price' => 40.00,
            'quantity_received' => 5,
            'quantity_remaining' => 5,
            'received_at' => now()->subDays(2),
        ]);

        $lot2 = InventoryLot::create([
            'product_id' => $product->id,
            'cost_price' => 50.00,
            'quantity_received' => 10,
            'quantity_remaining' => 10,
            'received_at' => now()->subDay(),
        ]);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 8, 'unit_price' => 100.00],
        ]);

        $this->saleService->createSale($data, $this->cashier);

        // Lot 1 (5 qty) should be fully consumed, lot 2 should have 3 consumed
        $this->assertEquals(0, $lot1->fresh()->quantity_remaining);
        $this->assertEquals(7, $lot2->fresh()->quantity_remaining);
    }

    public function test_insufficient_stock_throws_exception(): void
    {
        $product = $this->createProduct(['stock_quantity' => 2]);
        $this->createInventoryLot($product, 2);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100.00],
        ]);

        $this->expectException(\App\Exceptions\InsufficientStockException::class);
        $this->saleService->createSale($data, $this->cashier);
    }

    // ── Payment Methods ──

    public function test_online_payment_records_bank_inflow(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $bankAccount = BankAccount::factory()->create(['balance' => 0]);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            [
                'payment_method' => 'online',
                'bank_account_id' => $bankAccount->id,
            ]
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        $bankAccount->refresh();
        $this->assertEquals((float) $sale->total, (float) $bankAccount->balance);
    }

    public function test_credit_payment_creates_customer_debt(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            [
                'payment_method' => 'credit',
                'customer_name' => 'John Doe',
                'customer_phone' => '09171234567',
            ]
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertDatabaseHas('customer_debts', [
            'sale_id' => $sale->id,
            'customer_name' => 'John Doe',
            'total_amount' => $sale->total,
        ]);
    }

    // ── Loyalty Points ──

    public function test_loyalty_points_awarded_for_customer_sale(): void
    {
        $customer = Customer::factory()->create(['loyalty_points' => 0]);
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            ['customer_id' => $customer->id]
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        // 1 point per peso of total
        $expectedPoints = (int) floor((float) $sale->total);
        $this->assertEquals($expectedPoints, $customer->fresh()->loyalty_points);
    }

    // ── Warranty ──

    public function test_warranty_auto_created_for_warranty_products(): void
    {
        $product = $this->createProduct([
            'has_warranty' => true,
            'warranty_months' => 12,
        ]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $warranty = Warranty::where('sale_id', $sale->id)->first();
        $this->assertNotNull($warranty);
        $this->assertEquals(12, $warranty->warranty_months);
        $this->assertEquals($product->id, $warranty->product_id);
    }

    public function test_no_warranty_for_non_warranty_products(): void
    {
        $product = $this->createProduct([
            'has_warranty' => false,
            'warranty_months' => null,
        ]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertEquals(0, Warranty::where('sale_id', $sale->id)->count());
    }

    // ── Void Sale ──

    public function test_void_sale_restores_stock(): void
    {
        $product = $this->createProduct(['stock_quantity' => 50]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);
        $this->assertEquals(45, $product->fresh()->stock_quantity);

        $this->saleService->voidSale($sale, $this->cashier);

        $this->assertEquals(50, $product->fresh()->stock_quantity);
        $this->assertEquals('voided', $sale->fresh()->status);
    }

    public function test_void_online_sale_reverses_bank_balance(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);
        $bankAccount = BankAccount::factory()->create(['balance' => 0]);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            ['payment_method' => 'online', 'bank_account_id' => $bankAccount->id]
        );

        $sale = $this->saleService->createSale($data, $this->cashier);
        $balanceAfterSale = (float) $bankAccount->fresh()->balance;
        $this->assertGreaterThan(0, $balanceAfterSale);

        $this->saleService->voidSale($sale, $this->cashier);

        $this->assertEquals(0.00, (float) $bankAccount->fresh()->balance);
    }

    // ── Process Return ──

    public function test_process_return_restocks_items(): void
    {
        $product = $this->createProduct(['stock_quantity' => 50]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);
        $this->assertEquals(45, $product->fresh()->stock_quantity);

        $saleItem = $sale->items->first();

        $saleReturn = $this->saleService->processReturn($sale, [
            ['sale_item_id' => $saleItem->id, 'quantity_returned' => 2],
        ], [
            'type' => 'refund',
            'refund_method' => 'cash',
            'reason' => 'Defective item',
        ], $this->cashier);

        $this->assertStringStartsWith('RTN-', $saleReturn->return_number);
        $this->assertEquals(47, $product->fresh()->stock_quantity);
    }

    public function test_cannot_return_from_non_completed_sale(): void
    {
        $product = $this->createProduct(['stock_quantity' => 50]);
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);
        $this->saleService->voidSale($sale, $this->cashier);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Only completed sales can have returns.');

        $this->saleService->processReturn($sale->fresh(), [
            ['sale_item_id' => $sale->items->first()->id, 'quantity_returned' => 1],
        ], ['type' => 'refund'], $this->cashier);
    }

    // ── Inventory Session Lock ──

    public function test_sale_blocked_during_active_inventory_session(): void
    {
        \App\Models\InventorySession::create([
            'started_by' => $this->cashier->id,
            'started_at' => now(),
            'status' => 'active',
        ]);

        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Sales are disabled during an active inventory count.');

        $this->saleService->createSale($data, $this->cashier);
    }

    // ── Cash Drawer Session ──

    public function test_sale_attaches_cash_drawer_session(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $session = CashDrawerSession::create([
            'user_id' => $this->cashier->id,
            'opening_balance' => 1000.00,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $data = $this->buildSaleData([
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ]);

        $sale = $this->saleService->createSale($data, $this->cashier);

        $this->assertEquals($session->id, $sale->cash_drawer_session_id);
    }

    // ── Change Calculation ──

    public function test_change_calculated_for_cash_payment(): void
    {
        $product = $this->createProduct();
        $this->createInventoryLot($product, 50);

        $data = $this->buildSaleData(
            [['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00]],
            ['amount_tendered' => 500.00]
        );

        $sale = $this->saleService->createSale($data, $this->cashier);

        // total = 100 + 12 = 112; change = 500 - 112 = 388
        $this->assertEquals(388.00, (float) $sale->change_amount);
    }
}
