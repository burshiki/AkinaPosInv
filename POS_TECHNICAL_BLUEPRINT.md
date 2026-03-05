# POS System with Advanced Inventory — Technical Blueprint

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Database Schema](#2-database-schema)
3. [Product Assembly — The "WiFi Vendo" Builder](#3-product-assembly--the-wifi-vendo-builder)
4. [Integrated Financials & Online Banking](#4-integrated-financials--online-banking)
5. [Customer Credit/Debt System](#5-customer-creditdebt-system)
6. [User-Based Access Control (Spatie)](#6-user-based-access-control-spatie)
7. [API & Controller Strategy](#7-api--controller-strategy)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Global Config Snippets](#9-global-config-snippets)
10. [Directory Structure](#10-directory-structure)
11. [Verification & Testing Strategy](#11-verification--testing-strategy)
12. [Customer Module](#12-customer-module)
13. [Purchase Order Module](#13-purchase-order-module)

---

## 1. Project Overview

### High-Level Goals

A full-featured Point-of-Sale application designed for a small business that operates retail sales, ISP collections, WiFi vendo operations, and manages multiple financial accounts.

1. **Offline-first operation** using SQLite — the POS works without internet connectivity.
2. **Product assembly** (the "WiFi Vendo Builder") — build assembled products from component inventory.
3. **Multi-account financials** — track cash drawer, GCash, Maya, BDO, and other accounts with full ledger history.
4. **Customer credit/debt** — allow sales on credit with payment tracking and aging reports.
5. **User-based access** — each user gets individual module-level permissions (no roles).
6. **Customer management** — maintain a customer directory with contact info and active/inactive status.
7. **Supplier purchasing** — create purchase orders, track order status, and receive stock directly into inventory.

### Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Backend      | Laravel 12 (PHP 8.2)               |
| Frontend     | React 18 + TypeScript + Inertia.js |
| UI Framework | Shadcn/UI (Radix UI) + Tailwind CSS|
| Database     | SQLite (WAL mode, offline-first)   |
| Permissions  | Spatie Laravel-Permission           |
| Timezone     | `Asia/Manila` system-wide           |
| Build Tool   | Vite                                |
| Language     | TypeScript (all `.tsx`/`.ts` files) |

### Architecture Diagram

```
+--------------------------------------------------------------+
|                        Browser (SPA-like)                     |
|  React 18 + TypeScript + Inertia.js Client                   |
|  Shadcn/UI (Radix) + Tailwind CSS                            |
|  Pages: Dashboard | POS | Inventory | Banking | Reports      |
|         Customers | Purchase Orders                           |
+-------------------------------+------------------------------+
                                |  Inertia Protocol (XHR)
                                |  (No separate API — server-
                                |   driven props via Inertia)
+-------------------------------v------------------------------+
|                     Laravel 12 Backend                        |
|                                                               |
|  Middleware Layer:                                             |
|    HandleInertiaRequests | Spatie PermissionMiddleware        |
|                                                               |
|  Controller Layer (Resource Controllers):                     |
|    ProductController | SaleController | BankAccountController |
|    AssemblyController | DebtController | ReportController     |
|    CustomerController | PurchaseOrderController               |
|                                                               |
|  Service Layer (Business Logic):                              |
|    AssemblyService | SaleService | BankingService             |
|    DebtService | ReportService | PurchaseOrderService         |
|                                                               |
|  Model Layer (Eloquent + Spatie HasPermissions trait):        |
|    User | Product | Category | Sale | SaleItem                |
|    BankAccount | BankAccountLedger | CustomerDebt             |
|    DebtPayment | AssemblyComponent | Customer                 |
|    PurchaseOrder | PurchaseOrderItem                          |
|                                                               |
+-------------------------------+------------------------------+
                                |
                  +-------------v--------------+
                  |     SQLite Database         |
                  |  WAL mode, PRAGMA tweaks    |
                  |  Single file: database.sqlite|
                  +----------------------------+
```

### Offline-First Strategy with SQLite

SQLite is the sole database. The strategy:

- **WAL mode** (`PRAGMA journal_mode=WAL`) — concurrent reads during writes.
- **Busy timeout** (`PRAGMA busy_timeout=5000`) — prevents immediate failures under contention.
- **Synchronous NORMAL** (`PRAGMA synchronous=NORMAL`) — balances durability and speed.
- **Foreign keys enforced** (`PRAGMA foreign_keys=ON`) — SQLite disables them by default.
- **Memory-mapped I/O** (`PRAGMA mmap_size=268435456`) — 256MB mapped reads.
- **Cache size** (`PRAGMA cache_size=-64000`) — 64MB page cache.
- The database file lives at `database/database.sqlite` and is excluded from version control.
- No internet dependency. The entire app runs on a local machine or LAN.
- Backups: periodically copy the SQLite file (cron job or manual export).

---

## 2. Database Schema

All timestamps use `created_at` and `updated_at`. The `deleted_at` column is added where soft deletes are noted. All monetary columns use `decimal(12,2)`. All enum columns are stored as strings in SQLite.

### 2.1 `users`

```
Schema: users
-------------------------------------------------------
id                  - integer, PK, auto-increment
name                - string(255), not null
email               - string(255), not null, unique
email_verified_at   - timestamp, nullable
password            - string(255), not null
is_admin            - boolean, not null, default false
remember_token      - string(100), nullable
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable (soft delete)
```

> Spatie creates its own tables (`permissions`, `model_has_permissions`) via its published migration. Since we use **user-based permissions only** (no roles), the `roles`, `model_has_roles`, and `role_has_permissions` tables will exist but remain unused.

### 2.2 `categories`

```
Schema: categories
-------------------------------------------------------
id                  - integer, PK, auto-increment
name                - string(255), not null, unique
description         - text, nullable
sort_order          - integer, not null, default 0
is_active           - boolean, not null, default true
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable

Indexes: (name)
```

### 2.3 `products`

```
Schema: products
-------------------------------------------------------
id                   - integer, PK, auto-increment
category_id          - integer, nullable, FK -> categories.id (SET NULL on delete)
name                 - string(255), not null
sku                  - string(100), not null, unique
barcode              - string(100), nullable, unique
description          - text, nullable
cost_price           - decimal(12,2), not null, default 0.00
selling_price        - decimal(12,2), not null, default 0.00
stock_quantity       - integer, not null, default 0
low_stock_threshold  - integer, not null, default 5
is_assembled         - boolean, not null, default false
is_active            - boolean, not null, default true
created_at           - timestamp, nullable
updated_at           - timestamp, nullable
deleted_at           - timestamp, nullable

Indexes: (sku), (barcode), (category_id), (is_assembled), (is_active)
```

### 2.4 `assembly_components`

```
Schema: assembly_components
-------------------------------------------------------
id                      - integer, PK, auto-increment
assembly_product_id     - integer, not null, FK -> products.id (CASCADE on delete)
component_product_id    - integer, not null, FK -> products.id (CASCADE on delete)
quantity_needed         - integer, not null, min 1
created_at              - timestamp, nullable
updated_at              - timestamp, nullable

Indexes: unique(assembly_product_id, component_product_id)
Constraint: assembly_product_id != component_product_id (enforced at app level)
```

### 2.5 `bank_accounts`

```
Schema: bank_accounts
-------------------------------------------------------
id                  - integer, PK, auto-increment
name                - string(255), not null
type                - string(50), not null
                      enum values: 'cash_drawer', 'gcash', 'maya', 'bdo', 'other'
account_number      - string(100), nullable
description         - text, nullable
balance             - decimal(12,2), not null, default 0.00
is_active           - boolean, not null, default true
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable

Indexes: (type), (is_active)
```

### 2.6 `sales`

```
Schema: sales
-------------------------------------------------------
id                  - integer, PK, auto-increment
receipt_number      - string(50), not null, unique
user_id             - integer, not null, FK -> users.id (RESTRICT on delete)
customer_name       - string(255), nullable
customer_phone      - string(50), nullable
payment_method      - string(50), not null
                      enum values: 'cash', 'online', 'credit'
bank_account_id     - integer, nullable, FK -> bank_accounts.id (SET NULL on delete)
                      (required when payment_method = 'online' or 'cash')
subtotal            - decimal(12,2), not null, default 0.00
discount_amount     - decimal(12,2), not null, default 0.00
total               - decimal(12,2), not null, default 0.00
amount_tendered     - decimal(12,2), nullable
change_amount       - decimal(12,2), nullable
status              - string(50), not null, default 'completed'
                      enum values: 'completed', 'voided', 'refunded'
notes               - text, nullable
sold_at             - timestamp, not null (defaults to now, Asia/Manila)
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable

Indexes: (receipt_number), (user_id), (payment_method), (status),
         (sold_at), (bank_account_id)
```

### 2.7 `sale_items`

```
Schema: sale_items
-------------------------------------------------------
id                  - integer, PK, auto-increment
sale_id             - integer, not null, FK -> sales.id (CASCADE on delete)
product_id          - integer, not null, FK -> products.id (RESTRICT on delete)
product_name        - string(255), not null (snapshot at time of sale)
product_sku         - string(100), not null (snapshot at time of sale)
quantity            - integer, not null, min 1
unit_price          - decimal(12,2), not null
cost_price          - decimal(12,2), not null (snapshot for profit calculation)
subtotal            - decimal(12,2), not null
created_at          - timestamp, nullable
updated_at          - timestamp, nullable

Indexes: (sale_id), (product_id)
```

### 2.8 `bank_account_ledger`

```
Schema: bank_account_ledger
-------------------------------------------------------
id                  - integer, PK, auto-increment
bank_account_id     - integer, not null, FK -> bank_accounts.id (CASCADE on delete)
type                - string(10), not null
                      enum values: 'in', 'out'
amount              - decimal(12,2), not null
running_balance     - decimal(12,2), not null
description         - string(500), not null
category            - string(100), nullable
                      enum values: 'sale', 'isp_collection', 'vendo_collection',
                                   'expense', 'transfer', 'adjustment',
                                   'debt_payment', 'other'
reference_type      - string(100), nullable (polymorphic: 'App\Models\Sale', etc.)
reference_id        - integer, nullable (polymorphic ID)
performed_by        - integer, nullable, FK -> users.id (SET NULL on delete)
transacted_at       - timestamp, not null
created_at          - timestamp, nullable
updated_at          - timestamp, nullable

Indexes: (bank_account_id, transacted_at), (type), (category),
         (reference_type, reference_id)
```

### 2.9 `customer_debts`

```
Schema: customer_debts
-------------------------------------------------------
id                  - integer, PK, auto-increment
customer_name       - string(255), not null
customer_phone      - string(50), nullable
sale_id             - integer, nullable, FK -> sales.id (SET NULL on delete)
total_amount        - decimal(12,2), not null
paid_amount         - decimal(12,2), not null, default 0.00
balance             - decimal(12,2), not null (= total_amount - paid_amount)
status              - string(50), not null, default 'unpaid'
                      enum values: 'unpaid', 'partial', 'paid'
due_date            - date, nullable
notes               - text, nullable
created_at          - timestamp, nullable
updated_at          - timestamp, nullable

Indexes: (customer_name), (status), (due_date), (sale_id)
```

### 2.10 `debt_payments`

```
Schema: debt_payments
-------------------------------------------------------
id                  - integer, PK, auto-increment
customer_debt_id    - integer, not null, FK -> customer_debts.id (CASCADE on delete)
bank_account_id     - integer, nullable, FK -> bank_accounts.id (SET NULL on delete)
payment_method      - string(50), not null
                      enum values: 'cash', 'online'
amount              - decimal(12,2), not null
received_by         - integer, nullable, FK -> users.id (SET NULL on delete)
notes               - text, nullable
paid_at             - timestamp, not null
created_at          - timestamp, nullable
updated_at          - timestamp, nullable

Indexes: (customer_debt_id), (bank_account_id), (paid_at)
```

### 2.11 `customers`

```
Schema: customers
-------------------------------------------------------
id                  - integer, PK, auto-increment
name                - string(255), not null
phone               - string(50), nullable
email               - string(255), nullable, unique
address             - text, nullable
notes               - text, nullable
is_active           - boolean, not null, default true
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable (soft delete)

Indexes: (email), (is_active)
```

### 2.12 `purchase_orders`

```
Schema: purchase_orders
-------------------------------------------------------
id                  - integer, PK, auto-increment
po_number           - string(50), not null, unique       (format: PO-YYYYMMDD-XXXX)
supplier_name       - string(255), not null
supplier_phone      - string(50), nullable
supplier_email      - string(255), nullable
supplier_address    - text, nullable
status              - string(50), not null, default 'draft'
                      enum values: 'draft', 'ordered', 'partially_received',
                                   'received', 'cancelled'
notes               - text, nullable
subtotal            - decimal(12,2), not null, default 0.00
total               - decimal(12,2), not null, default 0.00
ordered_at          - timestamp, nullable  (set when status becomes 'ordered')
received_at         - timestamp, nullable  (set when status becomes 'received')
created_by          - integer, not null, FK -> users.id (RESTRICT on delete)
created_at          - timestamp, nullable
updated_at          - timestamp, nullable
deleted_at          - timestamp, nullable (soft delete)

Indexes: (po_number), (status), (created_by), (ordered_at)
```

### 2.13 `purchase_order_items`

```
Schema: purchase_order_items
-------------------------------------------------------
id                    - integer, PK, auto-increment
purchase_order_id     - integer, not null, FK -> purchase_orders.id (CASCADE on delete)
product_id            - integer, nullable, FK -> products.id (SET NULL on delete)
product_name          - string(255), not null  (snapshot at time of order)
quantity_ordered      - integer, not null, min 1
quantity_received     - integer, not null, default 0
unit_cost             - decimal(12,2), not null
subtotal              - decimal(12,2), not null
notes                 - text, nullable
created_at            - timestamp, nullable
updated_at            - timestamp, nullable

Indexes: (purchase_order_id), (product_id)
Computed: remaining_quantity = quantity_ordered - quantity_received (app-level attribute)
```

### Entity-Relationship Summary

```
users ---< sales (user_id)
categories ---< products (category_id)
products ---< assembly_components (assembly_product_id)   [assembled product has many components]
products ---< assembly_components (component_product_id)  [a product can be a component of many assemblies]
products ---< sale_items (product_id)
sales ---< sale_items (sale_id)
sales ---< customer_debts (sale_id)                       [a credit sale creates a debt]
bank_accounts ---< bank_account_ledger (bank_account_id)
bank_accounts ---< sales (bank_account_id)                [online/cash sales hit a bank account]
customer_debts ---< debt_payments (customer_debt_id)
bank_accounts ---< debt_payments (bank_account_id)
users ---< bank_account_ledger (performed_by)
users ---< debt_payments (received_by)
users ---< purchase_orders (created_by)
purchase_orders ---< purchase_order_items (purchase_order_id)
products ---< purchase_order_items (product_id)           [nullable; stock incremented on receive]
```

---

## 3. Product Assembly — The "WiFi Vendo" Builder

### Concept

An "assembled product" (e.g., "WiFi Vendo Unit") is a product with `is_assembled = true`. It has rows in `assembly_components` defining its bill of materials:

| Assembly Product  | Component        | Quantity Needed |
|-------------------|------------------|-----------------|
| WiFi Vendo Unit   | Raspberry Pi 4   | 1               |
| WiFi Vendo Unit   | TP-Link Router   | 1               |
| WiFi Vendo Unit   | Coin Slot Module | 1               |
| WiFi Vendo Unit   | Enclosure Box    | 1               |
| WiFi Vendo Unit   | Power Supply 12V | 1               |

### Build Action Flow

1. User navigates to the Inventory page, selects an assembled product, clicks **"Build"**.
2. A dialog opens showing the bill of materials with current stock of each component and a **"Quantity to Build"** input (default: 1).
3. Frontend validates that `component.stock_quantity >= component.quantity_needed * build_qty` for every component. Insufficient components are highlighted red.
4. User confirms. A `POST` request is sent to `AssemblyController@build`.
5. Backend validates again inside a DB transaction, deducts component stock, increments assembled product stock.

### AssemblyController

```php
// app/Http/Controllers/AssemblyController.php

public function build(BuildAssemblyRequest $request, Product $product)
{
    $this->authorize('inventory.build');

    $quantity = $request->validated()['quantity'];

    try {
        $result = $this->assemblyService->build($product, $quantity);
        return back()->with('success', "Built {$quantity} x {$product->name}.");
    } catch (InsufficientStockException $e) {
        return back()->with('error', $e->getMessage());
    }
}
```

### BuildAssemblyRequest

```php
// app/Http/Requests/BuildAssemblyRequest.php

public function rules(): array
{
    return [
        'quantity' => ['required', 'integer', 'min:1', 'max:100'],
    ];
}
```

### AssemblyService

```php
// app/Services/AssemblyService.php

public function build(Product $product, int $quantity): Product
{
    if (!$product->is_assembled) {
        throw new \InvalidArgumentException('Product is not an assembled product.');
    }

    $components = $product->assemblyComponents()->with('componentProduct')->get();

    if ($components->isEmpty()) {
        throw new \InvalidArgumentException('No components defined for this assembly.');
    }

    return DB::transaction(function () use ($product, $quantity, $components) {
        foreach ($components as $component) {
            $componentProduct = Product::where('id', $component->component_product_id)
                ->lockForUpdate()
                ->first();

            $required = $component->quantity_needed * $quantity;

            if ($componentProduct->stock_quantity < $required) {
                throw new InsufficientStockException(
                    "Insufficient stock for {$componentProduct->name}: " .
                    "need {$required}, have {$componentProduct->stock_quantity}"
                );
            }

            $componentProduct->decrement('stock_quantity', $required);
        }

        $product->increment('stock_quantity', $quantity);

        return $product->fresh();
    });
}
```

> **Note on SQLite locking:** `lockForUpdate()` is effectively a no-op in SQLite because SQLite uses database-level locking, not row-level. However, wrapping in `DB::transaction` is essential for atomicity. The write lock on the database file itself ensures no concurrent build can interleave.

### Frontend Component Data

The controller passes component data as Inertia page props:

```php
// In AssemblyController@show or as part of product data
'components' => $product->assemblyComponents->map(fn ($ac) => [
    'component_product_id' => $ac->component_product_id,
    'component_name'       => $ac->componentProduct->name,
    'quantity_needed'       => $ac->quantity_needed,
    'stock_available'       => $ac->componentProduct->stock_quantity,
]),
```

---

## 4. Integrated Financials & Online Banking

### Multiple Bank Accounts

Seeded on install:

| Name         | Type          | Account Number |
|--------------|---------------|----------------|
| Cash Drawer  | cash_drawer   | null           |
| GCash        | gcash         | 09XXXXXXXXX    |
| Maya         | maya          | 09XXXXXXXXX    |
| BDO Savings  | bdo           | XXXX-XXXX-XXXX |

### Sale Payment Flow

**Cash payment:**
1. Sale is created with `payment_method = 'cash'`, `bank_account_id` points to the cash drawer account.
2. A ledger entry of type `in` with category `sale` is inserted into `bank_account_ledger` for the cash drawer.
3. Cash drawer balance is incremented.

**Online payment (GCash/Maya/BDO):**
1. Cashier selects "Online" as payment method, then selects which account (GCash, Maya, etc.) from a dropdown.
2. Sale is created with `payment_method = 'online'`, `bank_account_id` = selected account.
3. A ledger entry of type `in` with category `sale` is created for that bank account.
4. Bank account balance is incremented.

**Credit payment:**
1. Sale is created with `payment_method = 'credit'`, `bank_account_id = null`.
2. No ledger entry is created. Instead a `customer_debts` record is created.
3. When the customer pays later, a `debt_payments` record is created and a ledger entry hits the receiving bank account.

### BankingService

```php
// app/Services/BankingService.php

public function recordInflow(
    BankAccount $account,
    float $amount,
    string $description,
    string $category,
    ?string $referenceType = null,
    ?int $referenceId = null,
    ?int $performedBy = null
): BankAccountLedger {
    return DB::transaction(function () use (
        $account, $amount, $description, $category,
        $referenceType, $referenceId, $performedBy
    ) {
        $account->increment('balance', $amount);

        return BankAccountLedger::create([
            'bank_account_id' => $account->id,
            'type'            => 'in',
            'amount'          => $amount,
            'running_balance' => $account->fresh()->balance,
            'description'     => $description,
            'category'        => $category,
            'reference_type'  => $referenceType,
            'reference_id'    => $referenceId,
            'performed_by'    => $performedBy,
            'transacted_at'   => now(),
        ]);
    });
}

public function recordOutflow(
    BankAccount $account,
    float $amount,
    string $description,
    string $category,
    ?string $referenceType = null,
    ?int $referenceId = null,
    ?int $performedBy = null
): BankAccountLedger {
    return DB::transaction(function () use (
        $account, $amount, $description, $category,
        $referenceType, $referenceId, $performedBy
    ) {
        if ($account->balance < $amount) {
            throw new InsufficientBalanceException(
                "Insufficient balance in {$account->name}: " .
                "need {$amount}, have {$account->balance}"
            );
        }

        $account->decrement('balance', $amount);

        return BankAccountLedger::create([
            'bank_account_id' => $account->id,
            'type'            => 'out',
            'amount'          => $amount,
            'running_balance' => $account->fresh()->balance,
            'description'     => $description,
            'category'        => $category,
            'reference_type'  => $referenceType,
            'reference_id'    => $referenceId,
            'performed_by'    => $performedBy,
            'transacted_at'   => now(),
        ]);
    });
}

public function transfer(
    BankAccount $from,
    BankAccount $to,
    float $amount,
    int $performedBy
): array {
    return DB::transaction(function () use ($from, $to, $amount, $performedBy) {
        $outEntry = $this->recordOutflow(
            $from, $amount,
            "Transfer to {$to->name}",
            'transfer',
            BankAccount::class, $to->id, $performedBy
        );

        $inEntry = $this->recordInflow(
            $to, $amount,
            "Transfer from {$from->name}",
            'transfer',
            BankAccount::class, $from->id, $performedBy
        );

        return ['out' => $outEntry, 'in' => $inEntry];
    });
}
```

### In/Out Money Tracking Categories

| Category           | Direction | Description                                          |
|--------------------|-----------|------------------------------------------------------|
| `sale`             | in        | Revenue from POS sales                               |
| `isp_collection`   | in        | ISP subscription payments received                   |
| `vendo_collection` | in        | Physical coin collection from WiFi vendo machines    |
| `debt_payment`     | in        | Customer paying off a credit/debt                    |
| `expense`          | out       | Business expenses (supplies, rent, utilities)        |
| `transfer`         | in/out    | Moving money between accounts (2 entries created)    |
| `adjustment`       | in/out    | Manual balance correction by manager                 |
| `other`            | in/out    | Miscellaneous entries                                |

### Bank Account Reconciliation

1. Each ledger entry stores `running_balance` at the time of creation.
2. A "Reconcile" report page shows: `SUM(in) - SUM(out)` for a date range, compared to the account's current `balance` field.
3. If discrepancy exists, a manager can create an `adjustment` ledger entry to correct it.
4. The `bank_accounts.balance` column is the authoritative balance; the ledger provides the audit trail.

---

## 5. Customer Credit/Debt System

### Sale on Credit Flow

1. Cashier processes sale, selects "Credit" as payment method.
2. Cashier enters (or selects existing) customer name and phone.
3. `SaleService` creates the sale with `payment_method = 'credit'` and creates a `customer_debts` record:
   - `customer_name`, `customer_phone` from the sale
   - `sale_id` links to the sale
   - `total_amount` = sale total
   - `paid_amount` = 0
   - `balance` = sale total
   - `status` = 'unpaid'

### Running Balance Per Customer

```php
CustomerDebt::selectRaw("
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
```

### Payment Against Debts (FIFO Default)

When a customer makes a payment, the system applies it to the oldest unpaid debt first:

```php
// app/Services/DebtService.php

public function recordPayment(
    string $customerName,
    float $amount,
    BankAccount $bankAccount,
    string $paymentMethod,
    int $receivedBy
): Collection {
    return DB::transaction(function () use (
        $customerName, $amount, $bankAccount, $paymentMethod, $receivedBy
    ) {
        $debts = CustomerDebt::where('customer_name', $customerName)
            ->whereIn('status', ['unpaid', 'partial'])
            ->orderBy('created_at', 'asc')  // FIFO
            ->get();

        $remaining = $amount;
        $paymentsCreated = collect();

        foreach ($debts as $debt) {
            if ($remaining <= 0) break;

            $paymentAmount = min($remaining, $debt->balance);

            $payment = DebtPayment::create([
                'customer_debt_id' => $debt->id,
                'bank_account_id'  => $bankAccount->id,
                'payment_method'   => $paymentMethod,
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

        // Record inflow to bank account
        $actualPaid = $amount - $remaining;
        $this->bankingService->recordInflow(
            $bankAccount,
            $actualPaid,
            "Debt payment from {$customerName}",
            'debt_payment',
            null, null,
            $receivedBy
        );

        return $paymentsCreated;
    });
}
```

Manual allocation is also supported: the cashier can select a specific debt and pay against it directly.

### Debt Aging Report

Debt aging buckets: Current (0–30 days), 31–60 days, 61–90 days, 90+ days. Calculated using SQLite's `julianday()`:

```php
$now = now();
CustomerDebt::whereIn('status', ['unpaid', 'partial'])
    ->selectRaw("
        customer_name,
        SUM(CASE WHEN julianday(?) - julianday(created_at) <= 30
            THEN balance ELSE 0 END) as current_bucket,
        SUM(CASE WHEN julianday(?) - julianday(created_at) BETWEEN 31 AND 60
            THEN balance ELSE 0 END) as bucket_31_60,
        SUM(CASE WHEN julianday(?) - julianday(created_at) BETWEEN 61 AND 90
            THEN balance ELSE 0 END) as bucket_61_90,
        SUM(CASE WHEN julianday(?) - julianday(created_at) > 90
            THEN balance ELSE 0 END) as bucket_90_plus,
        SUM(balance) as total_outstanding
    ", [$now, $now, $now, $now])
    ->groupBy('customer_name')
    ->get();
```

---

## 6. User-Based Access Control (Spatie)

### Approach: Per-User Permissions (No Roles)

Each user receives permissions **directly** — there are no roles. An admin user toggles specific module permissions for each individual user via a checklist UI.

### Permissions List

```
inventory.view
inventory.create
inventory.edit
inventory.delete
inventory.build              (assembly action)
inventory.adjust_stock

sales.view
sales.create
sales.void
sales.refund

banking.view
banking.manage               (record inflows/outflows)
banking.transfer
banking.reconcile

debts.view
debts.create
debts.receive_payment

reports.view
reports.export

users.view
users.create
users.edit
users.delete
users.manage_permissions

customers.view
customers.create
customers.edit
customers.delete

purchasing.view
purchasing.create
purchasing.manage            (edit/cancel orders)
purchasing.receive           (receive items into stock)
purchasing.delete
```

### PermissionsSeeder

```php
// database/seeders/PermissionsSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'inventory.build', 'inventory.adjust_stock',
            'sales.view', 'sales.create', 'sales.void', 'sales.refund',
            'banking.view', 'banking.manage', 'banking.transfer', 'banking.reconcile',
            'debts.view', 'debts.create', 'debts.receive_payment',
            'reports.view', 'reports.export',
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'users.manage_permissions',
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            'purchasing.view', 'purchasing.create', 'purchasing.manage',
            'purchasing.receive', 'purchasing.delete',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }
    }
}
```

### AdminUserSeeder

```php
// database/seeders/AdminUserSeeder.php

namespace Database\Seeders;

use App\Models\User;
use Spatie\Permission\Models\Permission;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'name'     => 'Administrator',
            'email'    => 'admin@pos.local',
            'password' => bcrypt('password'),
            'is_admin' => true,
        ]);

        // Admin gets ALL permissions
        $admin->givePermissionTo(Permission::all());
    }
}
```

### User Management — Assigning Permissions

When creating or editing a user, the admin sees a grouped checklist:

```php
// app/Http/Controllers/UserController.php

public function create()
{
    return Inertia::render('Users/Create', [
        'availablePermissions' => $this->getGroupedPermissions(),
    ]);
}

public function store(StoreUserRequest $request)
{
    $this->authorize('users.create');

    $user = User::create([
        'name'     => $request->name,
        'email'    => $request->email,
        'password' => bcrypt($request->password),
    ]);

    $user->syncPermissions($request->permissions ?? []);

    return redirect()->route('users.index')
        ->with('success', "User {$user->name} created.");
}

private function getGroupedPermissions(): array
{
    return Permission::all()
        ->groupBy(fn ($p) => explode('.', $p->name)[0])
        ->map(fn ($group) => $group->pluck('name'))
        ->toArray();
}
```

### Route Middleware

```php
// routes/web.php

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Inventory module
    Route::middleware('permission:inventory.view')->group(function () {
        Route::resource('products', ProductController::class);
        Route::resource('categories', CategoryController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        Route::post('products/{product}/build', [AssemblyController::class, 'build'])
            ->name('assemblies.build')
            ->middleware('permission:inventory.build');
    });

    // Sales module
    Route::middleware('permission:sales.view')->group(function () {
        Route::resource('sales', SaleController::class);
        Route::post('sales/{sale}/void', [SaleController::class, 'void'])
            ->name('sales.void')
            ->middleware('permission:sales.void');
    });

    // Banking module
    Route::middleware('permission:banking.view')->group(function () {
        Route::resource('bank-accounts', BankAccountController::class);
        Route::post('bank-accounts/{bankAccount}/ledger',
            [BankAccountLedgerController::class, 'store'])
            ->name('bank-accounts.ledger.store')
            ->middleware('permission:banking.manage');
        Route::post('bank-accounts/transfer',
            [BankAccountLedgerController::class, 'transfer'])
            ->name('bank-accounts.transfer')
            ->middleware('permission:banking.transfer');
    });

    // Debts module
    Route::middleware('permission:debts.view')->group(function () {
        Route::resource('debts', CustomerDebtController::class)->only(['index', 'show']);
        Route::post('debts/payments', [DebtPaymentController::class, 'store'])
            ->name('debt-payments.store')
            ->middleware('permission:debts.receive_payment');
    });

    // Reports
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/{report}', [ReportController::class, 'show'])->name('reports.show');
    });

    // User management
    Route::middleware('permission:users.view')->group(function () {
        Route::resource('users', UserController::class);
    });
});
```

### Inertia Shared Permissions

```php
// app/Http/Middleware/HandleInertiaRequests.php

public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user() ? [
                'id'          => $request->user()->id,
                'name'        => $request->user()->name,
                'email'       => $request->user()->email,
                'is_admin'    => $request->user()->is_admin,
                'permissions' => $request->user()->getAllPermissions()->pluck('name'),
            ] : null,
        ],
        'flash' => [
            'success' => fn () => $request->session()->get('success'),
            'error'   => fn () => $request->session()->get('error'),
        ],
        'app' => [
            'timezone' => config('app.timezone'),
            'name'     => config('app.name'),
        ],
    ];
}
```

---

## 7. API & Controller Strategy

### Resource Controllers

| Controller                    | Resource       | Key Actions                                        |
|-------------------------------|----------------|----------------------------------------------------|
| `DashboardController`         | —              | index                                              |
| `ProductController`           | products       | index, create, store, show, edit, update, destroy  |
| `CategoryController`          | categories     | index, store, update, destroy                      |
| `AssemblyController`          | —              | show (BOM view), build (POST)                      |
| `SaleController`              | sales          | index, create, store, show, void                   |
| `BankAccountController`       | bank-accounts  | index, show, store, update                         |
| `BankAccountLedgerController` | —              | index (filtered by account), store, transfer       |
| `CustomerDebtController`      | debts          | index, show                                        |
| `DebtPaymentController`       | —              | store                                              |
| `ReportController`            | —              | index, show (parameterized by report type)         |
| `UserController`              | users          | index, create, store, edit, update, destroy        |

### Form Request Validation Classes

```
app/Http/Requests/
  BuildAssemblyRequest.php
  StoreBankAccountRequest.php
  StoreCategoryRequest.php
  StoreCustomerRequest.php
  StoreDebtPaymentRequest.php
  StoreLedgerEntryRequest.php
  StoreProductRequest.php
  StorePurchaseOrderRequest.php
  StoreSaleRequest.php
  StoreUserRequest.php
  TransferRequest.php
  UpdateCustomerRequest.php
  UpdateProductRequest.php
  UpdateUserRequest.php
  ReceivePurchaseOrderRequest.php
  VoidSaleRequest.php
```

**StoreSaleRequest example:**

```php
public function rules(): array
{
    return [
        'customer_name'      => ['nullable', 'string', 'max:255'],
        'customer_phone'     => ['nullable', 'string', 'max:50'],
        'payment_method'     => ['required', 'in:cash,online,credit'],
        'bank_account_id'    => ['required_if:payment_method,online',
                                 'required_if:payment_method,cash',
                                 'nullable', 'exists:bank_accounts,id'],
        'amount_tendered'    => ['required_if:payment_method,cash',
                                 'nullable', 'numeric', 'min:0'],
        'discount_amount'    => ['nullable', 'numeric', 'min:0'],
        'notes'              => ['nullable', 'string', 'max:1000'],
        'items'              => ['required', 'array', 'min:1'],
        'items.*.product_id' => ['required', 'exists:products,id'],
        'items.*.quantity'   => ['required', 'integer', 'min:1'],
        'items.*.unit_price' => ['required', 'numeric', 'min:0'],
    ];
}
```

### Service Classes

```
app/Services/
  AssemblyService.php       — build(), getBillOfMaterials(), validateBuildability()
  SaleService.php           — createSale(), voidSale(), generateReceiptNumber()
  BankingService.php        — recordInflow(), recordOutflow(), transfer(), getAccountSummary()
  DebtService.php           — createDebtFromSale(), recordPayment(), getCustomerSummary(), getAgingReport()
  ReportService.php         — salesReport(), inventoryReport(), financialReport(), debtReport()
  PurchaseOrderService.php  — generatePONumber(), createOrder(), receiveItems(), cancelOrder()
```

### SaleService — Core Business Logic

```php
// app/Services/SaleService.php

public function createSale(array $validated, User $cashier): Sale
{
    return DB::transaction(function () use ($validated, $cashier) {
        // 1. Generate receipt number
        $receiptNumber = $this->generateReceiptNumber();

        // 2. Calculate totals
        $subtotal = collect($validated['items'])->sum(
            fn ($item) => $item['quantity'] * $item['unit_price']
        );
        $discount = $validated['discount_amount'] ?? 0;
        $total = $subtotal - $discount;

        // 3. Create sale record
        $sale = Sale::create([
            'receipt_number'  => $receiptNumber,
            'user_id'         => $cashier->id,
            'customer_name'   => $validated['customer_name'] ?? null,
            'customer_phone'  => $validated['customer_phone'] ?? null,
            'payment_method'  => $validated['payment_method'],
            'bank_account_id' => $validated['bank_account_id'] ?? null,
            'subtotal'        => $subtotal,
            'discount_amount' => $discount,
            'total'           => $total,
            'amount_tendered' => $validated['amount_tendered'] ?? null,
            'change_amount'   => isset($validated['amount_tendered'])
                ? max(0, $validated['amount_tendered'] - $total) : null,
            'status'          => 'completed',
            'sold_at'         => now(),
        ]);

        // 4. Create sale items and deduct stock
        foreach ($validated['items'] as $item) {
            $product = Product::lockForUpdate()->findOrFail($item['product_id']);

            if ($product->stock_quantity < $item['quantity']) {
                throw new InsufficientStockException(
                    "Insufficient stock for {$product->name}"
                );
            }

            SaleItem::create([
                'sale_id'      => $sale->id,
                'product_id'   => $product->id,
                'product_name' => $product->name,
                'product_sku'  => $product->sku,
                'quantity'     => $item['quantity'],
                'unit_price'   => $item['unit_price'],
                'cost_price'   => $product->cost_price,
                'subtotal'     => $item['quantity'] * $item['unit_price'],
            ]);

            $product->decrement('stock_quantity', $item['quantity']);
        }

        // 5. Handle payment method side effects
        if (in_array($validated['payment_method'], ['cash', 'online'])) {
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

private function generateReceiptNumber(): string
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
```

---

## 8. Frontend Architecture

### ⚠️ UI/UX Convention — Modal-First Rule

> **Every create/edit/action form in this project MUST be implemented as an inline modal dialog (Shadcn `<Dialog>`), not a separate page navigation.**

This is a firm project-wide rule. When adding any new feature that involves a form, always follow this pattern:

#### Why
- The POS environment is fast-paced; navigating away from a list to fill a form and come back breaks the workflow.
- Modals keep the user in context (the list stays behind the dialog).

#### How — Standard Pattern

Every `Index.tsx` page owns its own create and edit dialogs. No separate `Create.tsx` or `Edit.tsx` pages should be used (they may exist as legacy but are not the active entry point).

```tsx
// State owned by the Index page
const [dialogOpen, setDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState<Item | null>(null);

// Inertia form — all fields live here
const form = useForm({ name: '', ... });

// Open for create
const openCreate = () => {
    setEditingItem(null);
    form.reset();
    form.clearErrors();
    setDialogOpen(true);
};

// Open for edit — populate form from existing record
const openEdit = (item: Item) => {
    setEditingItem(item);
    form.setData({ name: item.name, ... });
    form.clearErrors();
    setDialogOpen(true);
};

// Submit handler — PUT or POST depending on editingItem
const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
        form.put(route('resource.update', editingItem.id), {
            onSuccess: () => setDialogOpen(false),
        });
    } else {
        form.post(route('resource.store'), {
            onSuccess: () => setDialogOpen(false),
        });
    }
};

// In JSX — Dialog always present in the page, open/close controlled by state
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogContent className="max-w-lg">
        <DialogHeader>
            <DialogTitle>{editingItem ? `Edit: ${editingItem.name}` : 'New Item'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
            <form id="item-form" onSubmit={handleSubmit} className="space-y-4 py-1">
                {/* form fields */}
            </form>
        </ScrollArea>
        <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="item-form" disabled={form.processing}>
                {form.processing ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

#### Checklist for Every New Feature with a Form

- [ ] Form lives inside a `<Dialog>` in the parent `Index.tsx`
- [ ] `dialogOpen` + `editingX` state controls open/close
- [ ] `openCreate()` resets the form; `openEdit(item)` populates it
- [ ] `onSuccess: () => setDialogOpen(false)` closes after successful submission
- [ ] `<ScrollArea className="max-h-[70vh] pr-4">` wraps the form so tall forms don't overflow the viewport
- [ ] The form submit button uses `form="form-id"` so it can sit outside `<ScrollArea>` in `<DialogFooter>`
- [ ] Destructive actions (delete) use the `useConfirm()` confirm dialog, NOT a separate page

#### Destructive Actions Pattern

```tsx
const confirm = useConfirm();

const handleDelete = async (item: Item) => {
    const ok = await confirm({
        title: 'Delete Item',
        description: `Are you sure you want to delete "${item.name}"?`,
        confirmLabel: 'Delete',
        variant: 'destructive',
    });
    if (!ok) return;
    router.delete(route('resource.destroy', item.id));
};
```

---

### TypeScript Configuration

All frontend code uses **TypeScript**. Key config:

```jsonc
// tsconfig.json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "jsx": "react-jsx",
        "strict": true,
        "noEmit": true,
        "paths": {
            "@/*": ["./resources/js/*"]
        }
    },
    "include": ["resources/js/**/*.ts", "resources/js/**/*.tsx"]
}
```

### Inertia.js Page Structure

```
resources/js/
  app.tsx                              — Inertia app bootstrap
  types/
    index.d.ts                         — Global TypeScript interfaces
  hooks/
    use-permissions.ts                 — Permission checking hook
    use-debounce.ts                    — Debounce for search inputs
  lib/
    utils.ts                           — cn(), formatCurrency(), formatDate()
  components/
    ui/                                — Shadcn/UI components (auto-generated)
      button.tsx
      card.tsx
      data-table.tsx
      dialog.tsx
      dropdown-menu.tsx
      form.tsx
      input.tsx
      label.tsx
      select.tsx
      sheet.tsx
      table.tsx
      badge.tsx
      alert.tsx
      toast.tsx
      separator.tsx
      command.tsx                       — For barcode/search input
    app/                               — Application-specific shared components
      sidebar.tsx                      — Main navigation sidebar
      header.tsx                       — Page header with breadcrumbs
      currency-display.tsx             — Formatted PHP currency
      stock-badge.tsx                  — Color-coded stock level badge
      receipt-printer.tsx              — Receipt preview/print component
      permission-gate.tsx              — Conditional render based on permission
  layouts/
    authenticated-layout.tsx           — Sidebar + header + main content area
    guest-layout.tsx                   — Login/register pages
  pages/
    Auth/
      Login.tsx
    Dashboard/
      Index.tsx                        — Sales today, revenue, low stock alerts
    Products/
      Index.tsx                        — DataTable with search, filter by category
      Create.tsx                       — Product form
      Edit.tsx                         — Product form (edit mode)
      Show.tsx                         — Product detail + assembly BOM if applicable
    Categories/
      Index.tsx                        — List + inline create/edit dialogs
    Assemblies/
      Build.tsx                        — Build dialog/page for assembled product
    Sales/
      Index.tsx                        — Sales list with date range filter
      Create.tsx                       — POS screen (main cashier interface)
      Show.tsx                         — Receipt view
    BankAccounts/
      Index.tsx                        — Account cards with balances
      Show.tsx                         — Ledger view for single account
      RecordEntry.tsx                  — Dialog for manual in/out entry
      Transfer.tsx                     — Inter-account transfer dialog
    Debts/
      Index.tsx                        — Customer debt summary list
      Show.tsx                         — Single customer debts + payment history
      RecordPayment.tsx                — Payment dialog
    Reports/
      Index.tsx                        — Report selection
      Sales.tsx                        — Sales report with date range, charts
      Inventory.tsx                    — Stock levels, low stock, valuation
      Financial.tsx                    — P&L by date range, account summaries
      DebtAging.tsx                    — Aging buckets report
    Users/
      Index.tsx                        — User list
      Create.tsx                       — Create user + permission checklist
      Edit.tsx                         — Edit user + permission checklist
    Customers/
      Index.tsx                        — Customer list with search + active filter
      Create.tsx                       — Customer form
      Edit.tsx                         — Customer form (edit mode)
      Show.tsx                         — Customer detail view
    PurchaseOrders/
      Index.tsx                        — PO list with search + status filter, status badges
      Create.tsx                       — Supplier info + dynamic line items, save as draft or ordered
      Show.tsx                         — PO header + supplier info + line items (ordered/received/remaining)
      Receive.tsx                      — Receive items form, updates stock on confirm
```

### POS Screen Design (Sales/Create.tsx)

The most complex frontend page:

```
+-------------------------------------------------------+
| HEADER: "Point of Sale"             [User] [Logout]   |
+-------------------+-----------------------------------+
| LEFT PANEL (60%)  | RIGHT PANEL (40%)                 |
|                   |                                   |
| [Search/Barcode]  | CART                              |
| [Category Tabs]   |   Item 1     2x   ₱200    ₱400   |
|                   |   Item 2     1x   ₱150    ₱150   |
| Product Grid:     |                                   |
| +----+ +----+     |   Subtotal:           ₱550.00    |
| |Prod| |Prod|     |   Discount:           -₱0.00     |
| |  1 | |  2 |     |   TOTAL:              ₱550.00    |
| +----+ +----+     |                                   |
| +----+ +----+     | Payment Method:                   |
| |Prod| |Prod|     |   [Cash] [Online] [Credit]        |
| |  3 | |  4 |     |                                   |
| +----+ +----+     | [Amount Tendered: ________]       |
|                   | [Change: ₱0.00]                   |
|                   |                                   |
|                   | [       COMPLETE SALE       ]      |
+-------------------+-----------------------------------+
```

Key interactions:
- Barcode scan input auto-focuses. Scanning adds the product to cart.
- Clicking a product tile adds it to cart (quantity increments if already present).
- Cart items have quantity +/- buttons and a remove button.
- Payment method toggle shows/hides relevant fields (bank account selector for Online, customer name for Credit).

### Shadcn/UI Component Usage

| Component       | Usage                                                      |
|-----------------|------------------------------------------------------------|
| `DataTable`     | Products list, sales list, ledger entries, debts list      |
| `Dialog`        | Build assembly, record ledger entry, record payment        |
| `Form`          | All create/edit forms (react-hook-form + zod)              |
| `Select`        | Category filter, payment method, bank account selector     |
| `Command`       | Barcode/product search input on POS screen                 |
| `Card`          | Bank account balance cards, dashboard stat cards           |
| `Badge`         | Stock level indicators, sale status, debt status           |
| `Sheet`         | Mobile sidebar navigation                                  |
| `Toast`         | Success/error notifications after actions                  |
| `DropdownMenu`  | Row actions in data tables (edit, delete, build, void)     |
| `Separator`     | Visual dividers in forms and receipt views                 |
| `Alert`         | Low stock warnings, insufficient stock errors              |

### TypeScript Types

```typescript
// resources/js/types/index.d.ts

export interface User {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    permissions: string[];
}

export interface PageProps {
    auth: { user: User | null };
    flash: { success: string | null; error: string | null };
    app: { timezone: string; name: string };
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface Product {
    id: number;
    category_id: number | null;
    category?: Category;
    name: string;
    sku: string;
    barcode: string | null;
    description: string | null;
    cost_price: number;
    selling_price: number;
    stock_quantity: number;
    low_stock_threshold: number;
    is_assembled: boolean;
    is_active: boolean;
    assembly_components?: AssemblyComponent[];
}

export interface AssemblyComponent {
    id: number;
    assembly_product_id: number;
    component_product_id: number;
    quantity_needed: number;
    component_product?: Product;
}

export interface Sale {
    id: number;
    receipt_number: string;
    user_id: number;
    user?: User;
    customer_name: string | null;
    customer_phone: string | null;
    payment_method: 'cash' | 'online' | 'credit';
    bank_account_id: number | null;
    bank_account?: BankAccount;
    subtotal: number;
    discount_amount: number;
    total: number;
    amount_tendered: number | null;
    change_amount: number | null;
    status: 'completed' | 'voided' | 'refunded';
    notes: string | null;
    items?: SaleItem[];
    sold_at: string;
}

export interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    subtotal: number;
}

export interface BankAccount {
    id: number;
    name: string;
    type: 'cash_drawer' | 'gcash' | 'maya' | 'bdo' | 'other';
    account_number: string | null;
    description: string | null;
    balance: number;
    is_active: boolean;
}

export interface BankAccountLedgerEntry {
    id: number;
    bank_account_id: number;
    bank_account?: BankAccount;
    type: 'in' | 'out';
    amount: number;
    running_balance: number;
    description: string;
    category: 'sale' | 'isp_collection' | 'vendo_collection' | 'expense'
        | 'transfer' | 'adjustment' | 'debt_payment' | 'other';
    reference_type: string | null;
    reference_id: number | null;
    performed_by: number | null;
    transacted_at: string;
}

export interface CustomerDebt {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    sale_id: number | null;
    sale?: Sale;
    total_amount: number;
    paid_amount: number;
    balance: number;
    status: 'unpaid' | 'partial' | 'paid';
    due_date: string | null;
    notes: string | null;
    payments?: DebtPayment[];
}

export interface DebtPayment {
    id: number;
    customer_debt_id: number;
    bank_account_id: number | null;
    bank_account?: BankAccount;
    payment_method: 'cash' | 'online';
    amount: number;
    received_by: number | null;
    notes: string | null;
    paid_at: string;
}

// Pagination type for Inertia
export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export interface Customer {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    product_id: number | null;
    product?: Product;
    product_name: string;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    subtotal: number;
    notes: string | null;
    remaining_quantity: number;
}

export interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier_name: string;
    supplier_phone: string | null;
    supplier_email: string | null;
    supplier_address: string | null;
    status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
    notes: string | null;
    subtotal: number;
    total: number;
    ordered_at: string | null;
    received_at: string | null;
    created_by: number;
    creator?: User;
    items?: PurchaseOrderItem[];
    created_at: string;
}
```

### Permission Hook

```typescript
// resources/js/hooks/use-permissions.ts
import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

export function usePermission() {
    const { auth } = usePage<PageProps>().props;

    const can = (permission: string): boolean => {
        return auth.user?.permissions?.includes(permission) ?? false;
    };

    return { can };
}
```

### PermissionGate Component

```tsx
// resources/js/components/app/permission-gate.tsx
import { usePermission } from '@/hooks/use-permissions';
import type { PropsWithChildren, ReactNode } from 'react';

interface PermissionGateProps extends PropsWithChildren {
    permission: string;
    fallback?: ReactNode;
}

export function PermissionGate({
    permission,
    children,
    fallback = null,
}: PermissionGateProps) {
    const { can } = usePermission();
    return can(permission) ? <>{children}</> : <>{fallback}</>;
}
```

### Utility Functions

```typescript
// resources/js/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
}

export function formatDate(
    dateString: string,
    timezone: string = 'Asia/Manila',
): string {
    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone,
    }).format(new Date(dateString));
}
```

---

## 9. Global Config Snippets

### app.php — Timezone

```php
// config/app.php
'timezone' => 'Asia/Manila',
```

### HandleInertiaRequests.php — Full Middleware

```php
// app/Http/Middleware/HandleInertiaRequests.php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id'          => $request->user()->id,
                    'name'        => $request->user()->name,
                    'email'       => $request->user()->email,
                    'is_admin'    => $request->user()->is_admin,
                    'permissions' => $request->user()
                        ->getAllPermissions()
                        ->pluck('name'),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],
            'app' => [
                'timezone' => config('app.timezone'),
                'name'     => config('app.name'),
            ],
        ];
    }
}
```

### Spatie Permission Config

```php
// config/permission.php — key overrides for SQLite
'teams' => false,
'cache' => [
    'expiration_time' => \DateInterval::createFromDateString('24 hours'),
    'key' => 'spatie.permission.cache',
    'store' => 'file',  // Use file cache for permissions
],
```

### SQLite Optimization — Service Provider

```php
// app/Providers/DatabaseServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;

class DatabaseServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (config('database.default') === 'sqlite') {
            DB::statement('PRAGMA journal_mode=WAL;');
            DB::statement('PRAGMA synchronous=NORMAL;');
            DB::statement('PRAGMA busy_timeout=5000;');
            DB::statement('PRAGMA mmap_size=268435456;');
            DB::statement('PRAGMA cache_size=-64000;');
            DB::statement('PRAGMA temp_store=MEMORY;');
        }
    }
}
```

> The service provider approach is preferred over migrations because PRAGMAs are connection-level, not persistent (except `journal_mode=WAL` which persists).

### database.php — SQLite Connection

```php
// config/database.php
'sqlite' => [
    'driver'                  => 'sqlite',
    'url'                     => env('DB_URL'),
    'database'                => env('DB_DATABASE', database_path('database.sqlite')),
    'prefix'                  => '',
    'foreign_key_constraints' => true,  // PRAGMA foreign_keys = ON
],
```

### Vite Config (TypeScript)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
});
```

---

## 10. Directory Structure

```
pos/
├── app/
│   ├── Exceptions/
│   │   ├── InsufficientBalanceException.php
│   │   └── InsufficientStockException.php
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AssemblyController.php
│   │   │   ├── BankAccountController.php
│   │   │   ├── BankAccountLedgerController.php
│   │   │   ├── CategoryController.php
│   │   │   ├── CustomerController.php
│   │   │   ├── CustomerDebtController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── DebtPaymentController.php
│   │   │   ├── ProductController.php
│   │   │   ├── PurchaseOrderController.php
│   │   │   ├── ReportController.php
│   │   │   ├── SaleController.php
│   │   │   └── UserController.php
│   │   ├── Middleware/
│   │   │   └── HandleInertiaRequests.php
│   │   └── Requests/
│   │       ├── BuildAssemblyRequest.php
│   │       ├── ReceivePurchaseOrderRequest.php
│   │       ├── StoreBankAccountRequest.php
│   │       ├── StoreCategoryRequest.php
│   │       ├── StoreCustomerRequest.php
│   │       ├── StoreDebtPaymentRequest.php
│   │       ├── StoreLedgerEntryRequest.php
│   │       ├── StoreProductRequest.php
│   │       ├── StorePurchaseOrderRequest.php
│   │       ├── StoreSaleRequest.php
│   │       ├── StoreUserRequest.php
│   │       ├── TransferRequest.php
│   │       ├── UpdateCustomerRequest.php
│   │       ├── UpdateProductRequest.php
│   │       ├── UpdateUserRequest.php
│   │       └── VoidSaleRequest.php
│   ├── Models/
│   │   ├── AssemblyComponent.php
│   │   ├── BankAccount.php
│   │   ├── BankAccountLedger.php
│   │   ├── Category.php
│   │   ├── Customer.php
│   │   ├── CustomerDebt.php
│   │   ├── DebtPayment.php
│   │   ├── Product.php
│   │   ├── PurchaseOrder.php
│   │   ├── PurchaseOrderItem.php
│   │   ├── Sale.php
│   │   ├── SaleItem.php
│   │   └── User.php
│   ├── Providers/
│   │   ├── AppServiceProvider.php
│   │   └── DatabaseServiceProvider.php
│   └── Services/
│       ├── AssemblyService.php
│       ├── BankingService.php
│       ├── DebtService.php
│       ├── PurchaseOrderService.php
│       ├── ReportService.php
│       └── SaleService.php
├── bootstrap/
├── config/
│   ├── app.php                        (timezone: Asia/Manila)
│   ├── database.php                   (SQLite + foreign_key_constraints)
│   └── permission.php                 (Spatie config, teams: false)
├── database/
│   ├── database.sqlite                (created at install, gitignored)
│   ├── factories/
│   │   ├── ProductFactory.php
│   │   ├── SaleFactory.php
│   │   └── UserFactory.php
│   ├── migrations/
│   │   ├── 0001_01_01_000000_create_users_table.php
│   │   ├── 0001_01_01_000001_create_cache_table.php
│   │   ├── 0001_01_01_000002_create_jobs_table.php
│   │   ├── 2024_01_01_000010_create_permission_tables.php   (Spatie published)
│   │   ├── 2024_01_01_000020_create_categories_table.php
│   │   ├── 2024_01_01_000030_create_products_table.php
│   │   ├── 2024_01_01_000040_create_assembly_components_table.php
│   │   ├── 2024_01_01_000050_create_bank_accounts_table.php
│   │   ├── 2024_01_01_000060_create_sales_table.php
│   │   ├── 2024_01_01_000070_create_sale_items_table.php
│   │   ├── 2024_01_01_000080_create_bank_account_ledger_table.php
│   │   ├── 2024_01_01_000090_create_customer_debts_table.php
│   │   ├── 2024_01_01_000100_create_debt_payments_table.php
│   │   ├── 2026_03_03_100000_create_customers_table.php
│   │   ├── 2026_03_03_100010_create_purchase_orders_table.php
│   │   └── 2026_03_03_100020_create_purchase_order_items_table.php
│   └── seeders/
│       ├── AdminUserSeeder.php
│       ├── BankAccountSeeder.php
│       ├── DatabaseSeeder.php
│       └── PermissionsSeeder.php
├── resources/
│   ├── css/
│   │   └── app.css                    (Tailwind directives + Shadcn CSS variables)
│   ├── js/
│   │   ├── app.tsx
│   │   ├── components/
│   │   │   ├── app/
│   │   │   │   ├── currency-display.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   ├── permission-gate.tsx
│   │   │   │   ├── receipt-printer.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── stock-badge.tsx
│   │   │   └── ui/                    (Shadcn/UI generated components)
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── data-table.tsx
│   │   │       ├── dialog.tsx
│   │   │       └── ...
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   └── use-permissions.ts
│   │   ├── layouts/
│   │   │   ├── authenticated-layout.tsx
│   │   │   └── guest-layout.tsx
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── Auth/
│   │   │   │   └── Login.tsx
│   │   │   ├── Assemblies/
│   │   │   │   └── Build.tsx
│   │   │   ├── BankAccounts/
│   │   │   │   ├── Index.tsx
│   │   │   │   ├── RecordEntry.tsx
│   │   │   │   ├── Show.tsx
│   │   │   │   └── Transfer.tsx
│   │   │   ├── Categories/
│   │   │   │   └── Index.tsx
│   │   │   ├── Dashboard/
│   │   │   │   └── Index.tsx
│   │   │   ├── Debts/
│   │   │   │   ├── Index.tsx
│   │   │   │   ├── RecordPayment.tsx
│   │   │   │   └── Show.tsx
│   │   │   ├── Products/
│   │   │   │   ├── Create.tsx
│   │   │   │   ├── Edit.tsx
│   │   │   │   ├── Index.tsx
│   │   │   │   └── Show.tsx
│   │   │   ├── Reports/
│   │   │   │   ├── DebtAging.tsx
│   │   │   │   ├── Financial.tsx
│   │   │   │   ├── Index.tsx
│   │   │   │   ├── Inventory.tsx
│   │   │   │   └── Sales.tsx
│   │   │   ├── Sales/
│   │   │   │   ├── Create.tsx         (POS Screen)
│   │   │   │   ├── Index.tsx
│   │   │   │   └── Show.tsx
│   │   │   └── Users/
│   │   │       ├── Create.tsx
│   │   │       ├── Edit.tsx
│   │   │       └── Index.tsx
│   │   │   ├── Customers/
│   │   │   │   ├── Create.tsx
│   │   │   │   ├── Edit.tsx
│   │   │   │   ├── Index.tsx
│   │   │   │   └── Show.tsx
│   │   │   └── PurchaseOrders/
│   │   │       ├── Create.tsx
│   │   │       ├── Index.tsx
│   │   │       ├── Receive.tsx
│   │   │       └── Show.tsx
│   │   └── types/
│   │       └── index.d.ts
│   └── views/
│       └── app.blade.php             (Inertia root template)
├── routes/
│   ├── auth.php
│   └── web.php
├── tests/
│   ├── Feature/
│   │   ├── Assembly/
│   │   │   └── BuildAssemblyTest.php
│   │   ├── Banking/
│   │   │   ├── BankAccountLedgerTest.php
│   │   │   └── TransferTest.php
│   │   ├── Debts/
│   │   │   └── DebtPaymentTest.php
│   │   ├── Permissions/
│   │   │   └── UserAccessTest.php
│   │   └── Sales/
│   │       ├── CreateSaleTest.php
│   │       └── VoidSaleTest.php
│   └── Unit/
│       └── Services/
│           ├── AssemblyServiceTest.php
│           ├── BankingServiceTest.php
│           ├── DebtServiceTest.php
│           └── SaleServiceTest.php
├── .env
├── .env.example
├── composer.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 11. Verification & Testing Strategy

### Testing the Build Action

```php
// tests/Feature/Assembly/BuildAssemblyTest.php

class BuildAssemblyTest extends TestCase
{
    use RefreshDatabase;

    public function test_build_deducts_components_and_increments_assembled(): void
    {
        $assembly = Product::factory()->create([
            'is_assembled' => true, 'stock_quantity' => 0,
        ]);
        $componentA = Product::factory()->create(['stock_quantity' => 10]);
        $componentB = Product::factory()->create(['stock_quantity' => 20]);

        AssemblyComponent::create([
            'assembly_product_id'  => $assembly->id,
            'component_product_id' => $componentA->id,
            'quantity_needed'      => 2,
        ]);
        AssemblyComponent::create([
            'assembly_product_id'  => $assembly->id,
            'component_product_id' => $componentB->id,
            'quantity_needed'      => 3,
        ]);

        $user = User::factory()->create();
        $user->givePermissionTo(['inventory.view', 'inventory.build']);

        $this->actingAs($user)
            ->post(route('assemblies.build', $assembly), ['quantity' => 3])
            ->assertRedirect();

        $this->assertDatabaseHas('products', [
            'id' => $assembly->id, 'stock_quantity' => 3,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $componentA->id, 'stock_quantity' => 4,   // 10 - (2×3)
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $componentB->id, 'stock_quantity' => 11,  // 20 - (3×3)
        ]);
    }

    public function test_build_fails_with_insufficient_stock(): void
    {
        $assembly = Product::factory()->create([
            'is_assembled' => true, 'stock_quantity' => 0,
        ]);
        $component = Product::factory()->create(['stock_quantity' => 2]);

        AssemblyComponent::create([
            'assembly_product_id'  => $assembly->id,
            'component_product_id' => $component->id,
            'quantity_needed'      => 5,
        ]);

        $user = User::factory()->create();
        $user->givePermissionTo(['inventory.view', 'inventory.build']);

        $this->actingAs($user)
            ->post(route('assemblies.build', $assembly), ['quantity' => 1])
            ->assertSessionHas('error');

        // Stock unchanged
        $this->assertDatabaseHas('products', [
            'id' => $assembly->id, 'stock_quantity' => 0,
        ]);
        $this->assertDatabaseHas('products', [
            'id' => $component->id, 'stock_quantity' => 2,
        ]);
    }
}
```

### Testing Financial Integrity

```php
// tests/Feature/Sales/CreateSaleTest.php

public function test_cash_sale_creates_ledger_entry_and_updates_drawer(): void
{
    $cashDrawer = BankAccount::factory()->create([
        'type' => 'cash_drawer', 'balance' => 1000.00,
    ]);
    $product = Product::factory()->create([
        'selling_price' => 250.00, 'stock_quantity' => 10,
    ]);

    $user = User::factory()->create();
    $user->givePermissionTo(['sales.view', 'sales.create']);

    $this->actingAs($user)->post(route('sales.store'), [
        'payment_method'  => 'cash',
        'bank_account_id' => $cashDrawer->id,
        'amount_tendered' => 600.00,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2, 'unit_price' => 250.00],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('bank_account_ledger', [
        'bank_account_id' => $cashDrawer->id,
        'type'            => 'in',
        'amount'          => 500.00,
        'category'        => 'sale',
    ]);

    $this->assertDatabaseHas('bank_accounts', [
        'id' => $cashDrawer->id, 'balance' => 1500.00,
    ]);

    $this->assertDatabaseHas('products', [
        'id' => $product->id, 'stock_quantity' => 8,
    ]);
}

public function test_credit_sale_creates_debt_not_ledger_entry(): void
{
    $product = Product::factory()->create([
        'selling_price' => 100.00, 'stock_quantity' => 5,
    ]);
    $user = User::factory()->create();
    $user->givePermissionTo(['sales.view', 'sales.create', 'debts.create']);

    $this->actingAs($user)->post(route('sales.store'), [
        'payment_method' => 'credit',
        'customer_name'  => 'Juan Dela Cruz',
        'customer_phone' => '09171234567',
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 100.00],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('customer_debts', [
        'customer_name' => 'Juan Dela Cruz',
        'total_amount'  => 100.00,
        'balance'       => 100.00,
        'status'        => 'unpaid',
    ]);

    $this->assertDatabaseCount('bank_account_ledger', 0);
}
```

### Testing FIFO Debt Payment

```php
// tests/Feature/Debts/DebtPaymentTest.php

public function test_fifo_payment_applies_to_oldest_debt_first(): void
{
    $cashDrawer = BankAccount::factory()->create([
        'type' => 'cash_drawer', 'balance' => 0,
    ]);

    $debt1 = CustomerDebt::factory()->create([
        'customer_name' => 'Maria',
        'total_amount'  => 200.00,
        'paid_amount'   => 0,
        'balance'       => 200.00,
        'status'        => 'unpaid',
        'created_at'    => now()->subDays(10),
    ]);

    $debt2 = CustomerDebt::factory()->create([
        'customer_name' => 'Maria',
        'total_amount'  => 300.00,
        'paid_amount'   => 0,
        'balance'       => 300.00,
        'status'        => 'unpaid',
        'created_at'    => now()->subDays(2),
    ]);

    $user = User::factory()->create();
    $user->givePermissionTo(['debts.view', 'debts.receive_payment']);

    $this->actingAs($user)->post(route('debt-payments.store'), [
        'customer_name'   => 'Maria',
        'amount'          => 250.00,
        'bank_account_id' => $cashDrawer->id,
        'payment_method'  => 'cash',
    ])->assertRedirect();

    // debt1 fully paid (200), debt2 partially paid (50)
    $this->assertDatabaseHas('customer_debts', [
        'id' => $debt1->id, 'balance' => 0, 'status' => 'paid',
    ]);
    $this->assertDatabaseHas('customer_debts', [
        'id' => $debt2->id, 'balance' => 250.00, 'status' => 'partial',
    ]);

    $this->assertDatabaseHas('bank_account_ledger', [
        'bank_account_id' => $cashDrawer->id,
        'amount'          => 250.00,
        'category'        => 'debt_payment',
    ]);
}
```

### Testing User-Based Access

```php
// tests/Feature/Permissions/UserAccessTest.php

public function test_user_without_permission_cannot_access_module(): void
{
    $user = User::factory()->create();
    // Give NO permissions

    $this->actingAs($user)
        ->get(route('users.index'))
        ->assertForbidden();

    $this->actingAs($user)
        ->get(route('products.index'))
        ->assertForbidden();
}

public function test_user_with_sales_permission_can_create_sale(): void
{
    $user = User::factory()->create();
    $user->givePermissionTo(['sales.view', 'sales.create']);

    $this->actingAs($user)
        ->get(route('sales.create'))
        ->assertOk();
}

public function test_user_with_inventory_but_no_sales_cannot_access_pos(): void
{
    $user = User::factory()->create();
    $user->givePermissionTo(['inventory.view', 'inventory.create']);

    $this->actingAs($user)
        ->get(route('sales.create'))
        ->assertForbidden();
}
```

### Smoke Test Checklist

1. **Product CRUD** — Create product, verify in listing, edit, soft-delete, verify hidden from active list.
2. **Assembly build** — Create assembled product with components, build, verify stock changes.
3. **Cash sale** — Add items to cart, pay cash, verify receipt, stock deduction, ledger entry.
4. **Online sale** — Pay via GCash, verify ledger hits GCash account.
5. **Credit sale** — Sell on credit, verify debt created, no ledger entry.
6. **Debt payment** — Pay off a debt, verify FIFO allocation, ledger entry.
7. **Bank transfer** — Transfer cash drawer to BDO, verify both ledger entries.
8. **Permission enforcement** — Login as different users with different permissions, verify accessible/blocked routes.
9. **Void sale** — Void a completed sale, verify stock is restored, reversal ledger entry created.
10. **Low stock alert** — Set threshold, deplete stock below it, verify dashboard shows alert.

### Implementation Sequence (Recommended Build Order)

| Phase | Focus                  | Description                                                        |
|-------|------------------------|--------------------------------------------------------------------|
| 1     | **Foundation**         | Laravel install, SQLite config, Spatie setup, User model, auth (Breeze + Inertia/React/TS), permissions seeder, authenticated layout with sidebar |
| 2     | **Inventory Core**     | Categories CRUD, Products CRUD, DataTable with search/filter       |
| 3     | **Assembly**           | AssemblyComponent model, BOM management UI, Build action           |
| 4     | **Banking**            | BankAccount model, seeder, ledger model, BankingService, account dashboard, manual entries |
| 5     | **POS / Sales**        | SaleService, POS screen (main cashier UI), receipt generation      |
| 6     | **Customer Debts**     | DebtService, credit sale flow, payment recording, debt listing     |
| 7     | **Reports**            | ReportService, sales/inventory/financial/debt aging reports        |
| 8     | **Polish**             | Dashboard stats, low stock alerts, void/refund, receipt printing, responsive design |
| 9     | **Customer Module**    | Customer model/migration, CustomerController, CRUD pages, permissions |
| 10    | **Purchase Orders**    | PurchaseOrder + PurchaseOrderItem models, PurchaseOrderService, PurchaseOrderController, receive flow |

---

## 12. Customer Module

### Overview

The Customer Module provides a standalone directory of customers with contact information and active/inactive status. It is separate from the `customer_debts` system (which stores customer names as raw strings per debt record). This module is for maintaining a formal customer database that can be referenced across the application.

### Database Table: `customers`

See [Section 2.11](#211-customers) for the full schema.

Key fields:
- `name` — required display name
- `phone` / `email` / `address` — optional contact info; email must be unique if provided
- `is_active` — soft toggle; inactive customers are hidden from default listings
- Soft deletes via `deleted_at`

### Routes

| Method | URI                    | Name               | Middleware           |
|--------|------------------------|--------------------|----------------------|
| GET    | /customers             | customers.index    | customers.view       |
| GET    | /customers/create      | customers.create   | customers.view       |
| POST   | /customers             | customers.store    | customers.create     |
| GET    | /customers/{id}        | customers.show     | customers.view       |
| GET    | /customers/{id}/edit   | customers.edit     | customers.view       |
| PUT    | /customers/{id}        | customers.update   | customers.edit       |
| DELETE | /customers/{id}        | customers.destroy  | customers.delete     |

All routes sit inside the `permission:customers.view` middleware group.

### Controller: `CustomerController`

```php
// app/Http/Controllers/CustomerController.php

public function index(Request $request)
{
    // Supports: ?search=name_or_email, ?status=active|inactive
    // Returns paginated Customer list via Inertia
}

public function store(StoreCustomerRequest $request)
{
    // Creates customer, returns redirect with success flash
}

public function update(UpdateCustomerRequest $request, Customer $customer)
{
    // Updates customer, returns redirect with success flash
}

public function destroy(Customer $customer)
{
    // Soft deletes customer, returns redirect with success flash
}
```

### Form Requests

**`StoreCustomerRequest`** — validates:
- `name`: required, string, max:255
- `phone`: nullable, string, max:50
- `email`: nullable, email, unique:customers
- `address`: nullable, text
- `notes`: nullable, text
- `is_active`: boolean (defaults to true)

**`UpdateCustomerRequest`** — same rules, but email unique rule ignores the current customer's id.

### Permissions

| Permission         | Description                     |
|--------------------|---------------------------------|
| `customers.view`   | Access customer list and detail |
| `customers.create` | Create new customers            |
| `customers.edit`   | Edit existing customers         |
| `customers.delete` | Soft-delete customers           |

### Frontend Pages

| File                        | Description                                              |
|-----------------------------|----------------------------------------------------------|
| `Customers/Index.tsx`       | Paginated table, search by name/email, status filter, dropdown actions (view/edit/delete) |
| `Customers/Create.tsx`      | Form: name, phone, email, address, notes, is_active toggle |
| `Customers/Edit.tsx`        | Same form pre-populated with existing values             |
| `Customers/Show.tsx`        | Read-only detail view showing all contact fields         |

### Sidebar Integration

- Icon: `UserRound` (lucide-react)
- Label: `Customers`
- Permission gate: `customers.view`
- Active match: `customers.*`

---

## 13. Purchase Order Module

### Overview

The Purchase Order (PO) Module manages the procurement of inventory from suppliers. It supports the full PO lifecycle from draft creation through delivery and stock receipt. When items are received, product `stock_quantity` is automatically incremented.

### Database Tables

See [Section 2.12](#212-purchase_orders) and [Section 2.13](#213-purchase_order_items) for full schemas.

### PO Lifecycle / Status Flow

```
draft  ──────────────────────────────────►  cancelled
  │
  ▼ (manually set to ordered)
ordered  ────────────────────────────────►  cancelled
  │
  ▼ (first receive action)
partially_received
  │
  ▼ (all items fully received)
received
```

| Status               | Editable | Receivable | Cancellable |
|----------------------|----------|------------|-------------|
| `draft`              | ✅       | ❌         | ✅          |
| `ordered`            | ❌       | ✅         | ✅          |
| `partially_received` | ❌       | ✅         | ❌          |
| `received`           | ❌       | ❌         | ❌          |
| `cancelled`          | ❌       | ❌         | ❌          |

### PO Number Format

Auto-generated by `PurchaseOrderService::generatePONumber()`:

```
PO-YYYYMMDD-XXXX
    │         └─ 4-digit zero-padded daily sequence (resets each day)
    └─ Date in Asia/Manila timezone
```

Example: `PO-20260303-0001`, `PO-20260303-0002`

### Routes

| Method | URI                              | Name                       | Extra Middleware         |
|--------|----------------------------------|----------------------------|--------------------------|
| GET    | /purchase-orders                 | purchase-orders.index      | purchasing.view          |
| GET    | /purchase-orders/create          | purchase-orders.create     | purchasing.view          |
| POST   | /purchase-orders                 | purchase-orders.store      | purchasing.create        |
| GET    | /purchase-orders/{id}            | purchase-orders.show       | purchasing.view          |
| GET    | /purchase-orders/{id}/receive    | purchase-orders.receive    | purchasing.receive       |
| POST   | /purchase-orders/{id}/receive    | purchase-orders.receive.store | purchasing.receive    |
| POST   | /purchase-orders/{id}/cancel     | purchase-orders.cancel     | purchasing.manage        |
| DELETE | /purchase-orders/{id}            | purchase-orders.destroy    | purchasing.delete (draft only) |

All routes sit inside the `permission:purchasing.view` middleware group.

### Service: `PurchaseOrderService`

```php
// app/Services/PurchaseOrderService.php

public function generatePONumber(): string
{
    // Queries last PO for today with pattern 'PO-YYYYMMDD-%'
    // Returns next sequential number, e.g. 'PO-20260303-0001'
}

public function createOrder(array $data, int $userId): PurchaseOrder
{
    // DB::transaction
    // Creates purchase_orders record
    // Creates purchase_order_items records (with subtotals)
    // Sets ordered_at if status = 'ordered'
    // Returns PurchaseOrder with items loaded
}

public function receiveItems(PurchaseOrder $po, array $items, ?string $notes): PurchaseOrder
{
    // DB::transaction
    // For each item: increment quantity_received (capped at remaining)
    // For each linked product: increment stock_quantity
    // Recalculate PO status: all received → 'received', else → 'partially_received'
    // Sets received_at when status becomes 'received'
    // Returns updated PurchaseOrder
}

public function cancelOrder(PurchaseOrder $po): PurchaseOrder
{
    // Only callable on draft/ordered (enforced in controller)
    // Sets status to 'cancelled'
    // Returns updated PurchaseOrder
}
```

### Controller: `PurchaseOrderController`

```php
// app/Http/Controllers/PurchaseOrderController.php

public function index(Request $request)
{
    // Supports: ?search=po_number_or_supplier, ?status=draft|ordered|...
    // Returns paginated PurchaseOrder list via Inertia
}

public function create()
{
    // Passes products list (id, name, cost_price) for line item autocomplete
}

public function store(StorePurchaseOrderRequest $request)
{
    // Calls PurchaseOrderService::createOrder()
    // Redirects to show page with success flash
}

public function show(PurchaseOrder $purchaseOrder)
{
    // Eager loads: items.product, creator
}

public function receiveForm(PurchaseOrder $purchaseOrder)
{
    // Ensures $purchaseOrder->isReceivable() or returns 403
    // Passes PO with items for the receive form
}

public function receiveItems(ReceivePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
{
    // Calls PurchaseOrderService::receiveItems()
    // Redirects to show page with success flash
}

public function cancel(PurchaseOrder $purchaseOrder)
{
    // Ensures status is draft or ordered
    // Calls PurchaseOrderService::cancelOrder()
}

public function destroy(PurchaseOrder $purchaseOrder)
{
    // Only soft-deletes if status = 'draft'
    // Returns redirect with success flash
}
```

### Form Requests

**`StorePurchaseOrderRequest`** — validates:
- `supplier_name`: required, string, max:255
- `supplier_phone` / `supplier_email` / `supplier_address`: nullable
- `status`: required, in: `draft`, `ordered`
- `notes`: nullable
- `items`: required, array, min:1
- `items.*.product_id`: nullable, exists:products,id
- `items.*.product_name`: required, string, max:255
- `items.*.quantity_ordered`: required, integer, min:1
- `items.*.unit_cost`: required, numeric, min:0
- `items.*.notes`: nullable

**`ReceivePurchaseOrderRequest`** — validates:
- `items`: required, array
- `items.*.id`: required, exists:purchase_order_items,id
- `items.*.quantity_received`: required, integer, min:0
- `notes`: nullable

### Stock Update on Receive

When items are received, each `purchase_order_item` with a linked `product_id` triggers:

```php
$product->increment('stock_quantity', $actualReceived);
```

Where `$actualReceived = min($inputQty, $item->remaining_quantity)` — quantity is capped to prevent over-receiving.

### Permissions

| Permission           | Description                          |
|----------------------|--------------------------------------|
| `purchasing.view`    | View PO list and details             |
| `purchasing.create`  | Create new purchase orders           |
| `purchasing.manage`  | Cancel existing orders               |
| `purchasing.receive` | Receive items and update stock       |
| `purchasing.delete`  | Delete draft purchase orders         |

### Frontend Pages

| File                          | Description                                                       |
|-------------------------------|-------------------------------------------------------------------|
| `PurchaseOrders/Index.tsx`    | Paginated list with search + status filter, status color badges, actions dropdown |
| `PurchaseOrders/Create.tsx`   | Supplier info section + dynamic line items table; auto-fills product name/cost when product selected; live subtotal computation; save as draft or mark as ordered |
| `PurchaseOrders/Show.tsx`     | PO header + supplier info + line items showing `ordered / received / remaining` per item; action buttons: Receive Items, Cancel, Delete |
| `PurchaseOrders/Receive.tsx`  | Form with all receivable items; defaults input to remaining quantity; submits to `purchase-orders.receive.store` |

### Sidebar Integration

- Icon: `ShoppingBag` (lucide-react)
- Label: `Purchase Orders`
- Permission gate: `purchasing.view`
- Active match: `purchase-orders.*`
