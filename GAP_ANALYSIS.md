# Akina POS — Senior Architect Gap Analysis

## Context
Full codebase review of a Laravel 12 + React 18 + Inertia.js POS system targeting retail and ISP/WiFi Vendo businesses in the Philippines. The system includes Build-to-Stock assembly, Accounts Receivable, multi-channel banking, cash drawer management, purchase orders, and warranty tracking. Currently runs on SQLite with ~60 React pages and 19 controllers.

---

## 1. Build-to-Stock Workflow Critique

### What You Have (Solid)
- BOM definition with component-to-assembly mapping
- Automatic cost rollup on BOM save (`AssemblyService.saveBom`)
- Row-level locking during builds (`lockForUpdate()`)
- Buildability validation before execution
- Stock adjustment audit trail for all movements

### Edge Cases You're Missing

#### CRITICAL — Must-Haves

**A. Cost Drift on Assembled Products**
- **Problem**: `saveBom()` recalculates `cost_price` only when BOM is saved. When component costs change via PO receiving (weighted average update in `PurchaseOrderService.receiveItems`), the assembled product's `cost_price` goes stale.
- **Fix**: After PO receive updates a component's cost, propagate upward — recalculate cost for every assembly that uses that component. Query `assembly_components` where `component_product_id = $product->id` and update each parent assembly's cost.

**B. No Stock Adjustment Records for Builds**
- **Problem**: `AssemblyService.build()` directly decrements component stock and increments assembly stock but does NOT create `StockAdjustment` records. This breaks your audit trail — builds are invisible in `/stock/transactions`.
- **Fix**: Create StockAdjustment entries (type: `assembly_build`) for both the component deductions and the assembly increment within the same transaction.

**C. No Build History Table**
- **Problem**: There's no dedicated `assembly_builds` table recording who built what, when, how many, and from which components at what cost. You can't answer "show me all builds from last month" or "what was the component cost at build time?"
- **Fix**: Create an `assembly_builds` table (product_id, quantity, built_by, component_snapshot JSON, total_cost, built_at) to serve as a manufacturing ledger.

#### VALUE-ADD — Competitive Advantages

**D. Waste/Scrap Tracking**
- Real builds have waste. A WiFi Vendo assembly might damage a connector or have a defective board. Add an optional `waste_qty` per component in the build form, and a `waste_adjustments` or new StockAdjustment type (`assembly_waste`) so you can track material loss rate over time.

**E. Partial Builds**
- Current max is 100 units per build (`BuildAssemblyRequest` max:100). But what if you start building 10 units and only 8 succeed? There's no way to record a partial build. Add a confirmation step post-build where the user can report actual yield vs. planned.

**F. Multi-Level BOM**
- Your BOM is single-level (assembly → components). If a component is itself assembled from sub-components, you can't chain builds. This may not be needed now, but flag it for v2.

**G. Component Reservation / Allocation**
- When someone starts a build, components aren't "reserved" — another user could sell those components before the build completes. In a multi-user scenario, add a `reserved_qty` field or a soft-lock mechanism.

---

## 2. Feature Gap Analysis — Power User Features

### Must-Haves (Stability / Legal / Accounting)

| # | Feature | Why |
|---|---------|-----|
| 1 | **Build audit trail** (see 1B/1C above) | Accounting requires traceability for all stock movements. Builds are currently a black hole. |
| 2 | **Return/Refund workflow** | You have `void` but no partial refunds or exchange handling. Voiding reverses the entire sale — you need item-level returns with stock reintegration logic. |
| 3 | **Tax computation (VAT/Non-VAT)** | Philippine BIR requires VAT tracking for businesses above threshold. No tax fields exist anywhere in sales or products. Add `tax_rate`, `tax_amount` to sales and products. |
| 4 | **Official Receipt / Invoice numbering** | BIR-compliant sequential numbering separate from your receipt_number. Required for formal business operations. |
| 5 | **End-of-Day (EOD) / Z-Report** | Cash drawer close is good, but you need a formal Z-report summarizing: total sales by payment method, voids, discounts, tax collected, drawer variance — printable for accounting. |
| 6 | **Database backup automation** | SQLite file can corrupt on power failure with no recovery path. Add a scheduled Laravel command to copy the `.sqlite` file to a dated backup daily. Store off-machine (cloud folder or separate drive). |
| 7 | ~~**Concurrent sale protection**~~ | **Not applicable** — with 1 cashier terminal, there are no concurrent sales. Remove from scope. |

### Value-Adds (Competitive Advantages for ISP/Vendo Business)

| # | Feature | Why |
|---|---------|-----|
| 8 | **Recurring Revenue / Subscription Billing** | ISP customers pay monthly. Add recurring invoice generation, overdue tracking, auto-disconnect flags. Integrate with your existing debt/AR system. |
| 9 | **Barcode Label Printing** | You support barcode scanning but no label generation. Add a bulk label print feature for newly received PO items. |
| 10 | **Product Bundling / Package Deals** | Sell "WiFi Vendo + 3 months service" as a bundle with a single SKU but multiple inventory impacts. Different from assembly — no physical build needed. |
| 11 | **Expense Categories & Budget Tracking** | Your ledger supports expenses but has no category hierarchy or budget limits. Add expense categories (utilities, rent, supplies, repairs) with monthly budget alerts. |
| 12 | **SMS/Notification for Low Stock & Overdue Debts** | Proactive alerts via SMS (common in PH) when stock hits threshold or AR is past due. |
| 13 | **Multi-location / Branch Support** | If you expand to multiple stores or vendo locations, you need location-based inventory, inter-branch transfers, and consolidated reporting. |
| 14 | **Customer Loyalty / Points System** | Track repeat purchases, offer discounts to loyal customers. Simple points-per-peso model. |

---

## 3. Data Integrity & SQLite — Your Deployment Context

### Deployment Profile: 1 Cashier + Inventory Clerk

**Verdict: SQLite is the right choice for your scale. Keep it.**

With one cashier terminal and one inventory clerk (who does not process sales), you will never hit SQLite's write contention ceiling. Sequential writes are fine. Your WAL mode + 5000ms busy timeout configuration is already well-tuned for this workload. No migration needed.

### TECHNICAL WARNINGS — What Still Applies at Your Scale

| # | Risk | Severity | Detail |
|---|------|----------|--------|
| 1 | **Database File Corruption** | **HIGH** | A power cut or OS crash during a WAL checkpoint can corrupt your single `.sqlite` file. There is no replication, no failover. This is the one real risk at any scale. **Fix: automated daily backup.** |
| 2 | **No Automated Backup** | **HIGH** | No backup mechanism exists in the codebase. One bad event = total data loss. Add a scheduled Laravel command (`php artisan backup:sqlite`) that copies `database/database.sqlite` to a dated file. Run it daily via the task scheduler. |
| 3 | **`lockForUpdate()` is a No-Op on SQLite** | **INFO** | Your `lockForUpdate()` calls in `SaleService` and `AssemblyService` do nothing on SQLite — it doesn't support row-level locks. This is **not a problem at your scale** since writes are naturally serialized, but be aware: if you ever migrate to MySQL/PostgreSQL, the locks will activate and you should test all transaction paths. |
| 4 | **No Full-Text Search** | **LOW** | Product search uses `LIKE '%term%'` which skips indexes. Fine for under ~2,000 products. No action needed now. |
| 5 | **Future Scale Trigger** | **INFO** | If you ever add a second cashier terminal, migrate to MySQL or PostgreSQL at that point. Your schema is clean standard Laravel — it's just a `.env` change plus testing. |

### What You Can Ignore (Not Relevant at Your Scale)
- ~~Write contention / SQLITE_BUSY errors~~ — only a problem with 3+ concurrent writers
- ~~Connection pooling~~ — not relevant for 1-2 PHP-FPM workers
- ~~Running balance race conditions~~ — sequential writes mean no race exists

### Immediate Action Required
Add a Windows Task Scheduler job (or Laravel scheduler entry in `app/Console/Kernel.php`) to copy the SQLite file daily:
```php
// In App\Console\Kernel.php
$schedule->command('backup:sqlite')->dailyAt('02:00');
```
Store backups to a separate drive or cloud folder (Google Drive, OneDrive). This is the single most important infrastructure task.

---

## 4. UX/DX Suggestions (Shadcn-Specific)

### POS Terminal (`Sales/Create.tsx` — 543 lines)

| # | Enhancement | Implementation |
|---|-------------|----------------|
| 1 | **Command Palette (cmdk)** | You already have `cmdk` installed but don't use it! Add a `Cmd+K` palette for: quick product search, switch payment method, apply discount, open cash drawer, void last item. This is a massive speed boost for power users. |
| 2 | **Keyboard-First Transaction Flow** | Map: `F1`=Cash, `F2`=Online, `F3`=Credit, `F4`=Apply Discount, `Enter`=Complete Sale, `Esc`=Clear Cart. Your barcode scan already uses Enter — add a mode switch so Enter after scanning adds to cart, but Enter in the payment section completes the sale. |
| 3 | **Split the 543-line POS page** | Extract into: `<ProductGrid>`, `<CartPanel>`, `<PaymentSection>`, `<ReceiptModal>`. Use a `useCart()` custom hook for cart state. This improves maintainability and makes each piece testable. |
| 4 | **Shadcn `Sheet` for Cart (Mobile)** | On smaller screens, use a slide-out `Sheet` component for the cart instead of a fixed sidebar. You don't have `Sheet` installed — add it via `npx shadcn@latest add sheet`. |
| 5 | **Toast + Sound on Scan** | Play an audible beep on successful barcode scan and show a brief toast. Use the existing `use-toast` hook. Cashiers often don't look at the screen while scanning. |
| 6 | **`Popover` for Quick Customer Add** | Instead of navigating to `/customers/create` mid-sale, use a `Popover` inline form to add a new customer without leaving the POS screen. |

### Inventory & Assembly

| # | Enhancement | Implementation |
|---|-------------|----------------|
| 7 | **Shadcn `Collapsible` for BOM** | Show/hide component details in the assembly view. Cleaner than always-visible tables for products with many components. |
| 8 | **`DataTable` with sorting/filtering** | Your stock tables use basic `<Table>`. Add column sorting, multi-filter, and export. Consider `@tanstack/react-table` with Shadcn's table primitives. |
| 9 | **Drag-and-drop BOM builder** | Let users drag components into an assembly's BOM instead of manual dropdowns. Use `dnd-kit` with Shadcn styling. |
| 10 | **Visual stock level indicators** | Replace numeric stock display with colored progress bars (green > threshold, yellow near threshold, red below). Use Shadcn `Progress` component. |

### Financial / Banking

| # | Enhancement | Implementation |
|---|-------------|----------------|
| 11 | **Shadcn `Tabs` for account switching** | On the bank accounts page, use horizontal tabs to switch between accounts instead of a list-then-detail pattern. Faster for daily reconciliation. |
| 12 | **Date range picker** | Your reports use separate from/to date inputs. Add a proper date range picker component. Install `react-day-picker` (Shadcn's calendar is built on it). |

---

## 5. MVP Refinement — What to Simplify or Cut

### Potential Bloat / Simplification Candidates

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **Warranty Tracking** | **Simplify** | Full warranty lifecycle (record serial → check → send to supplier) is complex. For MVP, reduce to just recording serial numbers at sale time. Expand later. |
| **Purchase Order Approval Workflow** | **Simplify** | Draft → Pending → Approved → Ordered → Received is 5 states. For a small business, collapse to: Draft → Ordered → Received. Add approval back when you have multiple purchasers. |
| **Inventory Sessions (Physical Count)** | **Keep** | Blocking sales during inventory is aggressive but correct for data integrity. This is a solid feature. |
| **6 Report Types** | **Simplify** | Sales, Inventory, Financial, DebtAging, InternalUse, Index — that's a lot. For MVP, consolidate into: Sales Summary, Inventory Status, Cash Position. Add granular reports later. |
| **Supplier Management (Full CRUD)** | **Simplify** | 4 pages for suppliers is overkill early on. Inline supplier info on PO creation (which you already snapshot) is sufficient. Full CRUD can come later. |
| **Profile Edit with Password/Delete** | **Keep as-is** | Standard Laravel Breeze scaffold. No changes needed. |
| **Multi-payment-method per sale** | **Add Later** | Currently each sale is one payment method. Split payments (part cash, part GCash) are common in PH retail. But this is complex — defer to post-MVP. |

### What to KEEP and invest in for MVP
1. POS terminal (your core UX)
2. Build-to-Stock (your differentiator — fix the gaps above)
3. Cash drawer management (essential for retail)
4. Accounts Receivable (critical for ISP/Vendo credit customers)
5. Bank account ledger (your single source of truth for cash flow)
6. Stock adjustments with full audit trail

---

## Summary Scorecard

| Category | Count |
|----------|-------|
| **Must-Haves** (Critical for stability/legal/accounting) | 6 active items (item 7 removed — not applicable) |
| **Value-Adds** (Competitive advantages) | 9 items |
| **Technical Warnings** (Architectural risks) | 2 active items (corruption + backup) |
| **UX Improvements** (Shadcn-specific) | 12 items |
| **Simplification Candidates** | 5 features to trim |

### Top 5 Priorities (If I Were Your Tech Lead)
1. **Fix Build audit trail** — silent stock movements are an accounting liability
2. **Implement automated SQLite backup** — one power cut = total data loss, fix this before going live
3. **Add tax/VAT fields** — BIR compliance is non-negotiable in PH
4. **Propagate component cost changes to assemblies** — your margins are wrong whenever a PO receive updates a component cost
5. **Wire up `cmdk` command palette** — already installed in `package.json`, zero cost, massive cashier UX win
