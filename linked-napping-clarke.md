# Architecture Audit: Akina POS vs. World-Class POS Standards

## Context
User requested a full expert-level POS architecture review — comparing the current system against industry-standard POS architectures worldwide, identifying gaps, and suggesting actionable improvements. This is an analysis + prioritized improvement plan.

---

## Current System Overview

| Dimension | Details |
|---|---|
| Stack | Laravel 12 + React 18 + Inertia.js + TypeScript |
| DB | MySQL/SQLite, Eloquent ORM |
| Auth | Laravel Breeze (session-based) + Spatie Permissions |
| Frontend | shadcn/ui + Tailwind CSS + Vite |
| Modules | POS Sales, Inventory, Purchasing, Banking, Cash Drawer, Debts, Warranties, Payroll, Reports |

---

## Phase 1: What the System DOES Well (Industry-Aligned)

These features match or exceed typical POS standards:

1. **Transactional integrity** — `DB::transaction()` + `lockForUpdate()` for race-condition-safe stock deduction
2. **Audit trail** — `StockAdjustment` (before/after qty), `BankAccountLedger` (every movement), cost snapshot on `SaleItem`
3. **Cash drawer management** — Full session open/close reconciliation, expense and transfer tracking
4. **Multi-payment methods** — Cash, online transfer, on-account (credit)
5. **Returns/Refunds** — `SaleReturn` + `SaleReturnItem` with partial return support and stock reversal
6. **Purchase order workflow** — Multi-status (draft → ordered → partially_received → received)
7. **Permission-based access control** — Granular 38-permission system via Spatie
8. **Tax handling** — Per-item VAT rates + `is_vat_exempt` flag, tax stored per line item
9. **Assembly/BOM** — Full bill-of-materials with component snapshot on build
10. **Warranty tracking** — Serial numbers, expiry, supplier claim forwarding
11. **Payroll module (Philippines-compliant)** — SSS, PhilHealth, PAG-IBIG, BIR withholding with tax tables, holiday pay, OT pay
12. **Soft deletes** — Historical data preserved on all financial models
13. **Service layer pattern** — Business logic properly extracted from controllers (7 services)

---

## Phase 2: GAPS vs. World-Class POS Standards

### 🔴 Critical Gaps (Core POS Capability Missing)

| Gap | Industry Standard | Current State | Impact |
|---|---|---|---|
| **Product Variants** | Color/size/weight variants with individual SKUs (e.g., Square, Shopify) | Single product = single SKU; variants are separate products | Messy catalog, duplicated data |
| **Item-Level Discounts** | Discount per line item (%, fixed, BOGO) | Only sale-wide flat `discount_amount` | Cannot handle promotions properly |
| **Promotions/Pricing Engine** | Time-based, quantity-based, customer-segment pricing | No promotions engine | Cannot run sales/campaigns |
| **Customer Loyalty Program** | Points, tiers, redemption (e.g., Toast, Square) | No loyalty/points system | No customer retention tools |
| **Offline Capability** | PWA or local app fallback (e.g., Square, Lightspeed) | Web-only, real-time DB required | POS breaks on internet outage |

### 🟠 High Priority Gaps

| Gap | Industry Standard | Current State | Impact |
|---|---|---|---|
| **REST API Layer** | Versioned API (v1/) for mobile POS, integrations | Inertia-only, no API endpoints | Cannot build mobile POS or integrate third-party apps |
| **Background Job Queue** | Async report generation, email notifications | Synchronous only | Slow reports, blocking requests |
| **Caching Strategy** | Redis cache for products, tax tables, permissions | File-based permission cache only | Performance degrades at scale |
| **Automated Tests** | Unit + integration tests for financial logic | No test files found | Regression risk on payroll/sales |
| **Percentage Discounts** | % or flat at sale level (toggle) | Flat amount only in `discount_amount` | Cashier must manually compute % |
| **Customer Segments/Tiers** | VIP, wholesale, walk-in pricing | No customer segment system | One price for all customers |
| **Low Stock Notifications** | Email/push when stock hits threshold | `low_stock_threshold` stored but no alerting | Manual monitoring required |
| **Export to Excel/CSV** | Report export to spreadsheet | No export feature visible | Cannot share reports externally |

### 🟡 Medium Priority Gaps

| Gap | Industry Standard | Current State |
|---|---|---|
| **Inventory Costing Method** | FIFO/LIFO/Weighted Average | Not implemented (no cost layer) |
| **Batch/Lot Tracking** | Batch numbers for traceability | Not implemented |
| **Expiry Date Tracking** | For food/pharma/perishable goods | Not implemented |
| **Automated Reorder** | Auto-generate PO at low stock | No automation |
| **Barcode Label Printing** | Print labels from product management | No label print feature |
| **Customer Purchase History** | Per-customer sales timeline | Data exists, UI limited |
| **Shift Management** | Employee shift scheduling tied to cash drawer | Drawer tied to user, no formal shift |
| **13th Month Pay** | Philippine labor law (for payroll module) | Not computed |
| **Leave Management** | Sick leave, vacation leave tracking | No leave types |
| **Recurring Payroll Deductions** | Auto-apply monthly loan/advance deductions | Manual per period |
| **Payroll GL Journal Entry** | Post payroll to chart of accounts | No accounting integration |

### 🟢 Low Priority / Future Consideration

| Gap | Notes |
|---|---|
| Multi-location/Branch support | Would require schema changes (add `branch_id` to sales, products, employees) |
| Multi-currency | For businesses operating in multiple currencies |
| E-commerce sync | Product/order sync with online store (Shopify, WooCommerce) |
| Kitchen Display System (KDS) | Only relevant for restaurants |
| Customer-facing display | Second screen for order confirmation |
| Franchise management | Multi-tenant architecture |

---

## Phase 3: Improvement Recommendations (Prioritized)

### Tier 1 — Quick Wins (Low effort, High value)
These can be implemented with minimal schema/architecture changes:

1. **Percentage Discount Toggle** — Add `discount_type` ('amount'|'percent') to `sales` table + UI toggle
2. **Item-Level Discounts** — Add `discount_amount` to `sale_items` table, update `SaleService`
3. **Export Reports to CSV/Excel** — Add `exportCsv()` to `ReportService` using Laravel Excel or manual CSV generation
4. **Low Stock Email Alerts** — Queue job `LowStockAlert` triggered after sale when stock < threshold
5. **Customer Purchase History UI** — Improve `Customers/Show.tsx` to show paginated sales timeline
6. **Barcode Label Print** — Add print-friendly label view in `Products/Show.tsx`
7. **13th Month Pay Calculator** — Add to `PayrollService` (totalBasicPaid / 12)
8. **Recurring Deduction Templates** — Add `employee_deductions` table for auto-applying per period

### Tier 2 — Medium Effort, High Value
Require new tables or significant logic:

9. **Customer Loyalty Points** — Add `loyalty_points` to `customers`, earn on sale, redeem as discount
10. **Promotions Engine** — New `promotions` + `promotion_rules` tables; apply in `SaleService`
11. **Product Variants** — New `product_variants` table (attribute + value), link to `sale_items`
12. **REST API Layer** — Add `routes/api.php` with Sanctum token auth for mobile POS endpoints
13. **Background Jobs** — Move `ReportService` heavy queries to `GenerateReport` queued job (Redis)
14. **Automated Tests** — PHPUnit tests for `PayrollService` and `SaleService` core logic
15. **Leave Management** — New `leave_requests` table linked to employees and attendance

### Tier 3 — Strategic / Large Scope
Require architectural changes:

16. **Multi-location Support** — Add `branches` table, add `branch_id` to products, sales, employees, cash drawer sessions
17. **Offline POS (PWA)** — Service worker + IndexedDB for cart/products; sync on reconnect
18. **Inventory Costing (FIFO)** — Add `inventory_lots` table, update `SaleService` to consume oldest lot first

---

## Phase 4: Files to Modify Per Improvement

### Tier 1 File Map

| Improvement | Files to Modify |
|---|---|
| % Discount Toggle | `database/migrations/new`, `app/Services/SaleService.php`, `app/Http/Requests/StoreSaleRequest.php`, `resources/js/Pages/Sales/Create.tsx` |
| Item-Level Discounts | `sale_items` migration, `SaleService.php`, `Sales/Create.tsx`, `types/index.d.ts` |
| CSV Export | `app/Services/ReportService.php`, `app/Http/Controllers/ReportController.php`, `resources/js/Pages/Reports/*.tsx` |
| Low Stock Alerts | `app/Jobs/LowStockAlert.php` (new), `app/Services/SaleService.php`, `.env` (mail config) |
| 13th Month Pay | `app/Services/PayrollService.php`, new route + controller method, `resources/js/Pages/Payroll/` |
| Recurring Deductions | New migration `employee_deductions`, `PayrollService.php`, `Payroll/Employees/Edit.tsx` |

---

## Verification Plan

After implementing each improvement:
1. **Discount tests** — Create a sale with % discount, verify total = subtotal - (subtotal × %) + tax
2. **Item discount** — Apply line-item discount, verify per-item subtotal and sale total
3. **CSV export** — Click export on any report, verify downloaded file matches screen data
4. **Low stock** — Sell a product below threshold, verify email/notification triggered
5. **13th month** — Compute 13th month for an employee with 12 months of payroll records
6. **Payroll tests** — Run `php artisan test` to verify no regressions in payroll math
7. **API endpoints** — `curl -H "Authorization: Bearer {token}" /api/v1/products` returns JSON

---

## Summary Score vs. World-Class POS

| Category | Score | Notes |
|---|---|---|
| Core Sales Processing | 8/10 | Solid, missing item-level discounts + promotions |
| Inventory Management | 7/10 | Missing variants, FIFO, lot tracking, auto-reorder |
| Customer Management | 5/10 | Basic; no loyalty, no segments, no history UI |
| Financial Accuracy | 9/10 | Excellent audit trail, tax handling, reconciliation |
| Payroll (Philippines) | 8/10 | Comprehensive; missing 13th month, leave, recurring deductions |
| Reporting | 6/10 | Good range; no export, no forecasting |
| Architecture Quality | 8/10 | Clean service layer, proper validation, good patterns |
| API/Integration | 2/10 | No API layer, no third-party integrations |
| Scalability | 4/10 | No caching, no queues, no multi-location |
| Resilience (Offline) | 1/10 | No offline capability |
| **Overall** | **6.5/10** | Good foundation, significant gaps in CRM, API, scalability |
