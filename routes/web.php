<?php

use App\Http\Controllers\AssemblyController;
use App\Http\Controllers\BankAccountController;
use App\Http\Controllers\BankAccountLedgerController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\CustomerDebtController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DebtPaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\CashDrawerController;
use App\Http\Controllers\SaleReturnController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WarrantyController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])
        ->middleware('permission:dashboard.view')
        ->name('dashboard');

    // Profile
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Inventory module
    Route::middleware('permission:inventory.view')->group(function () {
        Route::resource('products', ProductController::class);
        Route::resource('categories', CategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);
    });
    Route::middleware('permission:inventory.view|inventory.build')->group(function () {
        Route::get('assemblies', [AssemblyController::class, 'index'])
            ->name('assemblies.index');
        Route::get('assemblies/{product}', [AssemblyController::class, 'show'])
            ->name('assemblies.show');
        Route::post('assemblies/{product}/bom', [AssemblyController::class, 'saveBom'])
            ->name('assemblies.save-bom')
            ->middleware('permission:inventory.build');
        Route::post('products/{product}/build', [AssemblyController::class, 'build'])
            ->name('assemblies.build')
            ->middleware('permission:inventory.build');
    });

    // Cash Drawer module
    Route::middleware('permission:sales.view')->group(function () {
        Route::get('cash-drawer', [CashDrawerController::class, 'index'])
            ->name('cash-drawer.index');
        Route::get('cash-drawer/open', [CashDrawerController::class, 'create'])
            ->name('cash-drawer.create')
            ->middleware('permission:sales.create');
        Route::post('cash-drawer', [CashDrawerController::class, 'store'])
            ->name('cash-drawer.store')
            ->middleware('permission:sales.create');
        Route::get('cash-drawer/close', [CashDrawerController::class, 'showClose'])
            ->name('cash-drawer.close')
            ->middleware('permission:sales.create');
        Route::post('cash-drawer/close', [CashDrawerController::class, 'close'])
            ->name('cash-drawer.close.store')
            ->middleware('permission:sales.create');
        Route::post('cash-drawer/transfer', [CashDrawerController::class, 'transfer'])
            ->name('cash-drawer.transfer')
            ->middleware('permission:sales.create');
        Route::post('cash-drawer/expense', [CashDrawerController::class, 'expense'])
            ->name('cash-drawer.expense')
            ->middleware('permission:sales.create');
        Route::get('cash-drawer/{cashDrawer}', [CashDrawerController::class, 'show'])
            ->name('cash-drawer.show');
    });

    // Sales module
    Route::middleware('permission:sales.view')->group(function () {
        Route::resource('sales', SaleController::class)->only(['index', 'create', 'store', 'show']);
        Route::post('sales/{sale}/void', [SaleController::class, 'void'])
            ->name('sales.void')
            ->middleware('permission:sales.void');

        // Returns / Refunds
        Route::get('returns', [SaleReturnController::class, 'index'])
            ->name('returns.index');
        Route::get('sales/{sale}/return', [SaleReturnController::class, 'create'])
            ->name('sales.return');
        Route::post('sales/{sale}/return', [SaleReturnController::class, 'store'])
            ->name('sales.return.store');
        Route::get('returns/{saleReturn}', [SaleReturnController::class, 'show'])
            ->name('returns.show');
    });

    // Banking module
    Route::middleware('permission:banking.view')->group(function () {
        // Static paths first (before any {bankAccount} wildcard routes)
        Route::get('bank-accounts/transfer',
            [BankAccountLedgerController::class, 'transferForm'])
            ->name('bank-accounts.transfer')
            ->middleware('permission:banking.transfer');
        Route::post('bank-accounts/transfer',
            [BankAccountLedgerController::class, 'transfer'])
            ->name('bank-accounts.transfer.store')
            ->middleware('permission:banking.transfer');
        Route::get('bank-accounts/create',
            [BankAccountController::class, 'create'])
            ->name('bank-accounts.create')
            ->middleware('permission:banking.manage');

        // Collection routes
        Route::get('bank-accounts',
            [BankAccountController::class, 'index'])
            ->name('bank-accounts.index');
        Route::post('bank-accounts',
            [BankAccountController::class, 'store'])
            ->name('bank-accounts.store')
            ->middleware('permission:banking.manage');

        // Resource routes with {bankAccount}
        Route::get('bank-accounts/{bankAccount}',
            [BankAccountController::class, 'show'])
            ->name('bank-accounts.show');
        Route::get('bank-accounts/{bankAccount}/edit',
            [BankAccountController::class, 'edit'])
            ->name('bank-accounts.edit')
            ->middleware('permission:banking.manage');
        Route::put('bank-accounts/{bankAccount}',
            [BankAccountController::class, 'update'])
            ->name('bank-accounts.update')
            ->middleware('permission:banking.manage');
        Route::delete('bank-accounts/{bankAccount}',
            [BankAccountController::class, 'destroy'])
            ->name('bank-accounts.destroy')
            ->middleware('permission:banking.manage');
        Route::get('bank-accounts/{bankAccount}/record-entry',
            [BankAccountLedgerController::class, 'createForm'])
            ->name('bank-accounts.record-entry')
            ->middleware('permission:banking.manage');
        Route::post('bank-accounts/{bankAccount}/ledger',
            [BankAccountLedgerController::class, 'store'])
            ->name('bank-accounts.ledger.store')
            ->middleware('permission:banking.manage');
    });

    // Debts module
    Route::middleware('permission:debts.view')->group(function () {
        Route::get('debts', [CustomerDebtController::class, 'index'])->name('debts.index');
        Route::get('debts/payments/create', [DebtPaymentController::class, 'create'])
            ->name('debt-payments.create')
            ->middleware('permission:debts.receive_payment');
        Route::post('debts/payments', [DebtPaymentController::class, 'store'])
            ->name('debt-payments.store')
            ->middleware('permission:debts.receive_payment');
        Route::get('debts/{customerName}', [CustomerDebtController::class, 'show'])->name('debts.show');
    });

    // Reports
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/internal-use/print', [ReportController::class, 'printInternalUse'])->name('reports.internal-use.print');
        Route::get('reports/{report}', [ReportController::class, 'show'])->name('reports.show');
    });

    // Customers module
    Route::middleware('permission:customers.view')->group(function () {
        Route::post('customers/quick', [CustomerController::class, 'quickStore'])
            ->name('customers.quick-store')
            ->middleware('permission:customers.create');
        Route::resource('customers', CustomerController::class);
    });

    // Suppliers module
    Route::middleware('permission:suppliers.view')->group(function () {
        Route::resource('suppliers', SupplierController::class);
    });

    // Purchasing module
    Route::middleware('permission:purchasing.view')->group(function () {
        Route::get('purchase-orders/{purchaseOrder}/receive',
            [PurchaseOrderController::class, 'receiveForm'])
            ->name('purchase-orders.receive')
            ->middleware('permission:purchasing.receive');
        Route::post('purchase-orders/{purchaseOrder}/receive',
            [PurchaseOrderController::class, 'receiveItems'])
            ->name('purchase-orders.receive.store')
            ->middleware('permission:purchasing.receive');
        Route::post('purchase-orders/{purchaseOrder}/cancel',
            [PurchaseOrderController::class, 'cancel'])
            ->name('purchase-orders.cancel')
            ->middleware('permission:purchasing.manage');
        Route::post('purchase-orders/{purchaseOrder}/mark-ordered',
            [PurchaseOrderController::class, 'markOrdered'])
            ->name('purchase-orders.mark-ordered')
            ->middleware('permission:purchasing.manage');
        Route::resource('purchase-orders', PurchaseOrderController::class)
            ->only(['index', 'create', 'store', 'show', 'destroy']);
    });

    // User management
    Route::middleware('permission:users.view')->group(function () {
        Route::resource('users', UserController::class)->except(['show']);
    });

    // Stock module
    Route::middleware('permission:stock.view')->group(function () {
        Route::get('stock', [StockController::class, 'index'])->name('stock.index');
        Route::get('stock/transactions', [StockController::class, 'transactions'])->name('stock.transactions');
        Route::get('stock/transactions/print', [StockController::class, 'transactionsPrint'])->name('stock.transactions.print');
        Route::get('stock/count-sheet', [StockController::class, 'countSheet'])->name('stock.count-sheet');
    });
    Route::middleware('permission:stock.adjust')->group(function () {
        Route::post('stock/{product}/adjust', [StockController::class, 'adjust'])->name('stock.adjust');
        Route::post('stock/{product}/count', [StockController::class, 'inventoryCount'])->name('stock.count');
    });
    Route::middleware('permission:stock.manage_inventory')->group(function () {
        Route::post('stock/inventory/start', [StockController::class, 'startInventory'])->name('stock.inventory.start');
        Route::post('stock/inventory/end', [StockController::class, 'endInventory'])->name('stock.inventory.end');
    });

    // Warranty module
    Route::middleware('permission:warranties.view')->group(function () {
        Route::get('warranties', [WarrantyController::class, 'index'])->name('warranties.index');
    });
    Route::middleware('permission:warranties.record_serial')->group(function () {
        Route::post('warranties/{warranty}/record-serial', [WarrantyController::class, 'recordSerial'])
            ->name('warranties.record-serial');
    });
    Route::middleware('permission:warranties.check')->group(function () {
        Route::post('warranties/{warranty}/check', [WarrantyController::class, 'check'])
            ->name('warranties.check');
        Route::post('warranties/{warranty}/confirm', [WarrantyController::class, 'confirm'])
            ->name('warranties.confirm');
    });
    Route::middleware('permission:warranties.send_to_supplier')->group(function () {
        Route::post('warranties/{warranty}/send-to-supplier', [WarrantyController::class, 'sendToSupplier'])
            ->name('warranties.send-to-supplier');
    });
});

require __DIR__.'/auth.php';
