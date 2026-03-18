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
use App\Http\Controllers\WarrantyClaimController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\PayrollPeriodController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\PayrollRecordController;
use App\Http\Controllers\PayslipController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\ProductVariantController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\HolidayController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\RecurringBillController;
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
        Route::post('cash-drawer/cash-in', [CashDrawerController::class, 'cashIn'])
            ->name('cash-drawer.cash-in')
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
        Route::post('customers/{customer}/initial-debt', [CustomerController::class, 'storeInitialDebt'])
            ->name('customers.initial-debt')
            ->middleware('permission:debts.create');
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
        Route::post('purchase-orders/{purchaseOrder}/approve',
            [PurchaseOrderController::class, 'approve'])
            ->name('purchase-orders.approve')
            ->middleware('permission:purchasing.approve');
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
        // Static routes MUST appear before {warranty} wildcard
        Route::get('warranties/batch-record', [WarrantyController::class, 'batchRecordIndex'])
            ->name('warranties.batch-record')
            ->middleware('permission:warranties.record_serial');
        Route::get('warranties/{warranty}', [WarrantyController::class, 'show'])->name('warranties.show');
    });
    Route::middleware('permission:warranties.record_serial')->group(function () {
        Route::post('warranties/batch-record', [WarrantyController::class, 'batchRecordStore'])
            ->name('warranties.batch-record.store');
        Route::post('warranties/{warranty}/record-serial', [WarrantyController::class, 'recordSerial'])
            ->name('warranties.record-serial');
    });
    Route::middleware('permission:warranties.check')->group(function () {
        Route::post('warranties/{warranty}/claims', [WarrantyClaimController::class, 'store'])
            ->name('warranty-claims.store');
        Route::post('warranty-claims/{claim}/confirm', [WarrantyClaimController::class, 'confirm'])
            ->name('warranty-claims.confirm');
        Route::post('warranty-claims/{claim}/no-defect', [WarrantyClaimController::class, 'noDefect'])
            ->name('warranty-claims.no-defect');
    });
    Route::middleware('permission:warranties.send_to_supplier')->group(function () {
        Route::post('warranty-claims/{claim}/send-to-supplier', [WarrantyClaimController::class, 'sendToSupplier'])
            ->name('warranty-claims.send-to-supplier');
        Route::post('warranty-claims/{claim}/replace-from-stock', [WarrantyClaimController::class, 'replaceFromStock'])
            ->name('warranty-claims.replace-from-stock');
        Route::post('warranty-claims/{claim}/refund', [WarrantyClaimController::class, 'refund'])
            ->name('warranty-claims.refund');
        Route::post('warranty-claims/{claim}/receive-back', [WarrantyClaimController::class, 'receiveBack'])
            ->name('warranty-claims.receive-back');
        Route::post('warranty-claims/{claim}/send-defective-to-supplier', [WarrantyClaimController::class, 'sendDefectiveToSupplier'])
            ->name('warranty-claims.send-defective-to-supplier');
        Route::post('warranty-claims/{claim}/receive-defective-back', [WarrantyClaimController::class, 'receiveDefectiveBack'])
            ->name('warranty-claims.receive-defective-back');
    });
    Route::middleware('permission:warranties.view')->group(function () {
        Route::get('warranty-claims/{claim}/claiming-stub', [WarrantyClaimController::class, 'claimingStub'])
            ->name('warranty-claims.claiming-stub');
        Route::get('warranty-claims/{claim}/supplier-sheet', [WarrantyClaimController::class, 'supplierSheet'])
            ->name('warranty-claims.supplier-sheet');
    });

    // Payroll module
    Route::middleware('permission:payroll.view')->group(function () {
        Route::resource('employees', EmployeeController::class);

        Route::resource('payroll-periods', PayrollPeriodController::class)
            ->except(['edit', 'update']);

        Route::post('payroll-periods/{payrollPeriod}/compute', [PayrollPeriodController::class, 'compute'])
            ->name('payroll-periods.compute')
            ->middleware('permission:payroll.process');

        Route::post('payroll-periods/{payrollPeriod}/lock', [PayrollPeriodController::class, 'lock'])
            ->name('payroll-periods.lock')
            ->middleware('permission:payroll.approve');

        Route::post('payroll-periods/{payrollPeriod}/unlock', [PayrollPeriodController::class, 'unlock'])
            ->name('payroll-periods.unlock')
            ->middleware('permission:payroll.approve');

        Route::post('payroll-periods/{payrollPeriod}/mark-paid', [PayrollPeriodController::class, 'markPaid'])
            ->name('payroll-periods.mark-paid')
            ->middleware('permission:payroll.approve');

        Route::get('payroll-periods/{payrollPeriod}/attendance', [AttendanceController::class, 'edit'])
            ->name('attendance.edit')
            ->middleware('permission:payroll.attendance');

        Route::post('payroll-periods/{payrollPeriod}/attendance', [AttendanceController::class, 'bulkStore'])
            ->name('attendance.bulk-store')
            ->middleware('permission:payroll.attendance');

        Route::get('payroll-records/{payrollRecord}', [PayrollRecordController::class, 'show'])
            ->name('payroll-records.show');

        Route::put('payroll-records/{payrollRecord}', [PayrollRecordController::class, 'update'])
            ->name('payroll-records.update')
            ->middleware('permission:payroll.process');

        Route::post('payroll-records/{payrollRecord}/disburse', [PayrollRecordController::class, 'disburse'])
            ->name('payroll-records.disburse')
            ->middleware('permission:payroll.process');

        Route::post('payroll-records/{payrollRecord}/payslip', [PayslipController::class, 'generate'])
            ->name('payslips.generate')
            ->middleware('permission:payroll.process');

        Route::get('payslips/{payslip}', [PayslipController::class, 'show'])
            ->name('payslips.show');

        Route::get('holidays', [HolidayController::class, 'index'])
            ->name('holidays.index');
        Route::post('holidays', [HolidayController::class, 'store'])
            ->name('holidays.store')
            ->middleware('permission:payroll.process');
        Route::put('holidays/{holiday}', [HolidayController::class, 'update'])
            ->name('holidays.update')
            ->middleware('permission:payroll.process');
        Route::delete('holidays/{holiday}', [HolidayController::class, 'destroy'])
            ->name('holidays.destroy')
            ->middleware('permission:payroll.process');

        Route::get('payslips/{payslip}/print', [PayslipController::class, 'print'])
            ->name('payslips.print');

        // Recurring deductions
        Route::post('employees/{employee}/deductions', [RecurringDeductionController::class, 'store'])
            ->name('deductions.store')
            ->middleware('permission:payroll.process');
        Route::put('deductions/{deduction}', [RecurringDeductionController::class, 'update'])
            ->name('deductions.update')
            ->middleware('permission:payroll.process');
        Route::delete('deductions/{deduction}', [RecurringDeductionController::class, 'destroy'])
            ->name('deductions.destroy')
            ->middleware('permission:payroll.process');

        // Leave management
        Route::get('leave', [LeaveController::class, 'index'])->name('leave.index')->middleware('permission:leave.view');
        Route::post('leave', [LeaveController::class, 'store'])
            ->name('leave.store')
            ->middleware('permission:payroll.process');
        // Must be declared before leave/{leaveRequest} routes to avoid param conflict
        Route::post('leave/sil-cash-convert', [LeaveController::class, 'convertSilToCash'])
            ->name('leave.sil-convert')
            ->middleware('permission:payroll.process');
        Route::post('leave/{leaveRequest}/approve', [LeaveController::class, 'approve'])
            ->name('leave.approve')
            ->middleware('permission:payroll.approve');
        Route::post('leave/{leaveRequest}/reject', [LeaveController::class, 'reject'])
            ->name('leave.reject')
            ->middleware('permission:payroll.approve');
    });

    // CSV Exports
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('exports/sales', [ExportController::class, 'salesCsv'])->name('exports.sales');
        Route::get('exports/inventory', [ExportController::class, 'inventoryCsv'])->name('exports.inventory');
        Route::get('exports/financial', [ExportController::class, 'financialCsv'])->name('exports.financial');
        Route::get('exports/debt-aging', [ExportController::class, 'debtAgingCsv'])->name('exports.debt-aging');
    });

    // Promotions module
    Route::middleware('permission:promotions.view')->group(function () {
        Route::get('promotions', [PromotionController::class, 'index'])->name('promotions.index');
        Route::post('promotions', [PromotionController::class, 'store'])
            ->name('promotions.store')
            ->middleware('permission:promotions.manage');
        Route::put('promotions/{promotion}', [PromotionController::class, 'update'])
            ->name('promotions.update')
            ->middleware('permission:promotions.manage');
        Route::delete('promotions/{promotion}', [PromotionController::class, 'destroy'])
            ->name('promotions.destroy')
            ->middleware('permission:promotions.manage');
    });

    // Product variants & attributes
    Route::middleware('permission:inventory.view')->group(function () {
        Route::get('products/{product}/variants', [ProductVariantController::class, 'index'])
            ->name('products.variants.index');
        Route::post('products/{product}/variants', [ProductVariantController::class, 'store'])
            ->name('products.variants.store');
        Route::put('variants/{variant}', [ProductVariantController::class, 'update'])
            ->name('variants.update');
        Route::delete('variants/{variant}', [ProductVariantController::class, 'destroy'])
            ->name('variants.destroy');
        Route::post('attributes', [ProductVariantController::class, 'storeAttribute'])
            ->name('attributes.store');
        Route::post('attributes/{attribute}/values', [ProductVariantController::class, 'storeAttributeValue'])
            ->name('attributes.values.store');
    });

    // Accounts Payable module
    Route::middleware('permission:ap.view')->group(function () {
        Route::get('bills', [BillController::class, 'index'])->name('bills.index');
        Route::get('bills/create', [BillController::class, 'create'])
            ->name('bills.create')
            ->middleware('permission:ap.create');
        Route::post('bills', [BillController::class, 'store'])
            ->name('bills.store')
            ->middleware('permission:ap.create');
        Route::get('bills/{bill}', [BillController::class, 'show'])->name('bills.show');
        Route::get('bills/{bill}/pay', [BillController::class, 'payForm'])
            ->name('bills.pay')
            ->middleware('permission:ap.pay');
        Route::post('bills/{bill}/pay', [BillController::class, 'pay'])
            ->name('bills.pay.store')
            ->middleware('permission:ap.pay');
        Route::post('bills/{bill}/void', [BillController::class, 'void'])
            ->name('bills.void')
            ->middleware('permission:ap.void');
    });

    Route::middleware('permission:ap.manage_recurring')->group(function () {
        Route::resource('recurring-bills', RecurringBillController::class)
            ->except(['show']);
    });

    // Quotations
    Route::middleware('permission:sales.create')->group(function () {
        Route::get('quotations', [QuotationController::class, 'index'])->name('quotations.index');
        Route::get('quotations/create', [QuotationController::class, 'create'])->name('quotations.create');
        Route::post('quotations', [QuotationController::class, 'store'])->name('quotations.store');
        Route::get('quotations/{quotation}', [QuotationController::class, 'show'])->name('quotations.show');
        Route::get('quotations/{quotation}/print', [QuotationController::class, 'printView'])->name('quotations.print');
        Route::post('quotations/{quotation}/send-email', [QuotationController::class, 'sendEmail'])->name('quotations.send-email');
        Route::post('quotations/{quotation}/status', [QuotationController::class, 'updateStatus'])->name('quotations.update-status');
        Route::post('quotations/{quotation}/proceed-to-sale', [QuotationController::class, 'proceedToSale'])->name('quotations.proceed-to-sale');
        Route::delete('quotations/{quotation}', [QuotationController::class, 'destroy'])->name('quotations.destroy');
    });

    // Settings (admin only)
    Route::middleware('permission:users.view')->group(function () {
        Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
        Route::post('settings', [SettingController::class, 'update'])->name('settings.update');
    });

    // Database backup (admin only)
    Route::get('backup/download', [BackupController::class, 'download'])
        ->name('backup.download')
        ->middleware('permission:users.view');
});

require __DIR__.'/auth.php';
