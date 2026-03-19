import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { formatCurrency, formatDate, formatDateOnly } from '@/lib/utils';
import {
    CalendarDays, Wallet, Landmark, Package, PackageMinus, Users,
    TrendingUp, TrendingDown, DollarSign, BarChart3,
    ChevronDown, ChevronUp, ShoppingCart,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionSnapshot {
    id: number;
    user: string;
    closing_balance: number;
    closed_at: string | null;
}

interface BankAccountSnapshot {
    id: number;
    name: string;
    bank_name: string | null;
    account_number: string | null;
    balance: number;
}

interface CategoryBreakdown {
    category: string;
    total: number;
}

interface AccountBreakdown {
    account_name: string;
    total: number;
}

interface ByProduct {
    id: number | null;
    name: string;
    sku: string | null;
    total_qty: number;
    cost_price: number;
    total_cost: number;
}

interface InternalUseTransaction {
    id: number;
    date: string;
    product_name: string;
    product_sku: string | null;
    change_qty: number;
    cost_price: number;
    reason: string | null;
    user: string | null;
}

interface DailyEntry {
    date: string;
    count: number;
    revenue: number;
    cost: number;
    profit: number;
}

interface Report {
    period: { start: string; end: string };
    assets: {
        cash_on_drawers: { session: SessionSnapshot | null; total: number };
        bank_accounts: { accounts: BankAccountSnapshot[]; total: number };
        stock_value: number;
        internal_use_cost: number;
        customer_debt: number;
        total_assets: number;
    };
    sales: {
        summary: {
            total_sales: number;
            total_revenue: number;
            total_cost: number;
            total_profit: number;
            average_sale: number;
            voided_count: number;
        };
        daily: DailyEntry[];
        by_payment_method: Array<{ method: string; count: number; total: number }>;
        top_products: Array<{ name: string; quantity_sold: number; revenue: number }>;
    };
    income: {
        sales_revenue: number;
        debt_payments: number;
        cash_receipts: { by_category: CategoryBreakdown[]; total: number };
        bank_inflows: { by_account: AccountBreakdown[]; total: number };
        total: number;
    };
    expenses: {
        bills_paid: { by_category: CategoryBreakdown[]; total: number };
        cash_expenses: { by_category: CategoryBreakdown[]; total: number };
        bank_outflows: { by_account: AccountBreakdown[]; total: number };
        internal_use_cost: number;
        total: number;
    };
    net_income: number;
    internal_use: {
        period: { start: string; end: string };
        summary: { total_records: number; total_qty_consumed: number; total_cost: number };
        by_product: ByProduct[];
        transactions: InternalUseTransaction[];
    };
}

interface Props {
    report: Report | null;
    filters: { start_date?: string; end_date?: string };
}

// ── Helper Components ────────────────────────────────────────────────────────

function LineRow({ label, amount, sub }: { label: string; amount: number; sub?: boolean }) {
    return (
        <div className={`flex justify-between py-1 text-sm ${sub ? 'pl-4' : ''}`}>
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono font-medium">{formatCurrency(amount)}</span>
        </div>
    );
}

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
    return (
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-4">
            <Icon className="h-4 w-4" />
            {children}
        </h2>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MonthlyReport({ report, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate, setEndDate]     = useState(filters.end_date   ?? '');
    const [showBankAccounts, setShowBankAccounts] = useState(false);
    const [showTransactions, setShowTransactions] = useState(false);

    function runReport() {
        if (!startDate || !endDate) return;
        router.get(
            route('reports.show', 'monthly'),
            { start_date: startDate, end_date: endDate },
            { preserveState: false },
        );
    }

    function setThisMonth() {
        const now = new Date();
        const y   = now.getFullYear();
        const m   = String(now.getMonth() + 1).padStart(2, '0');
        setStartDate(`${y}-${m}-01`);
        setEndDate(now.toISOString().slice(0, 10));
    }

    return (
        <AuthenticatedLayout>
            <Head title="Monthly Report" />

            <div className="space-y-6 p-6">
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="h-6 w-6" />
                        Monthly Report
                    </h1>
                </div>

                {/* ── Filter Bar ─────────────────────────────────────────── */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1.5">
                                <Label>From</Label>
                                <Input
                                    type="date"
                                    className="w-40"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>To</Label>
                                <Input
                                    type="date"
                                    className="w-40"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" type="button" onClick={setThisMonth}>
                                This Month
                            </Button>
                            <Button
                                type="button"
                                onClick={runReport}
                                disabled={!startDate || !endDate}
                            >
                                Generate Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Empty State ────────────────────────────────────────── */}
                {!report ? (
                    <div className="rounded-md border h-40 flex items-center justify-center text-muted-foreground">
                        Select a date range and click Generate Report.
                    </div>
                ) : (
                    <>
                        {/* ── Assets Snapshot ──────────────────────────────── */}
                        <div>
                            <SectionHeading icon={DollarSign}>
                                Assets Snapshot&nbsp;
                                <span className="text-xs font-normal normal-case text-muted-foreground">
                                    (current live values)
                                </span>
                            </SectionHeading>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {/* Cash on Drawers */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-muted-foreground" />
                                            Cash on Hand (Drawer)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.assets.cash_on_drawers.total)}
                                        </div>
                                        {report.assets.cash_on_drawers.session ? (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Last close by {report.assets.cash_on_drawers.session.user}
                                                {report.assets.cash_on_drawers.session.closed_at
                                                    ? ` · ${formatDate(report.assets.cash_on_drawers.session.closed_at)}`
                                                    : ''}
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground mt-1">No closed sessions found</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Bank Accounts */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-muted-foreground" />
                                            Bank Accounts
                                        </CardTitle>
                                        {report.assets.bank_accounts.accounts.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowBankAccounts(!showBankAccounts)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                {showBankAccounts
                                                    ? <ChevronUp className="h-3.5 w-3.5" />
                                                    : <ChevronDown className="h-3.5 w-3.5" />}
                                            </button>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.assets.bank_accounts.total)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {report.assets.bank_accounts.accounts.length} active account{report.assets.bank_accounts.accounts.length !== 1 ? 's' : ''}
                                        </p>
                                        {showBankAccounts && report.assets.bank_accounts.accounts.length > 0 && (
                                            <div className="mt-3 space-y-1 border-t pt-2">
                                                {report.assets.bank_accounts.accounts.map((a) => (
                                                    <div key={a.id} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">
                                                            {a.name}{a.bank_name ? ` · ${a.bank_name}` : ''}
                                                        </span>
                                                        <span className="font-mono">{formatCurrency(a.balance)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Stock Value */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            Stock Value
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.assets.stock_value)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Current inventory at cost</p>
                                    </CardContent>
                                </Card>

                                {/* Internal Use Cost */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <PackageMinus className="h-4 w-4 text-muted-foreground" />
                                            Internal Use
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.assets.internal_use_cost)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Stock consumed in period</p>
                                    </CardContent>
                                </Card>

                                {/* Customer Debt */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            Customer Debt
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.assets.customer_debt)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Total outstanding receivables</p>
                                    </CardContent>
                                </Card>

                                {/* Total Assets — highlighted */}
                                <Card className="border-primary/40 bg-primary/5">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-primary">
                                            <BarChart3 className="h-4 w-4" />
                                            Total Assets
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-primary">
                                            {formatCurrency(report.assets.total_assets)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Cash + Bank + Stock + Int. Use + Debt
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* ── Monthly Sales ─────────────────────────────────── */}
                        <div>
                            <SectionHeading icon={BarChart3}>
                                Monthly Sales&nbsp;
                                <span className="text-xs font-normal normal-case text-muted-foreground">
                                    {formatDateOnly(report.period.start)} – {formatDateOnly(report.period.end)}
                                </span>
                            </SectionHeading>

                            {/* Summary stat cards */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.sales.summary.total_revenue)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {report.sales.summary.total_sales} transaction{report.sales.summary.total_sales !== 1 ? 's' : ''}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Cost of Goods</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.sales.summary.total_cost)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Product cost</p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.sales.summary.total_profit)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {report.sales.summary.total_revenue > 0
                                                ? `${((report.sales.summary.total_profit / report.sales.summary.total_revenue) * 100).toFixed(1)}% margin`
                                                : 'No sales'}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Avg. Transaction</CardTitle>
                                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(report.sales.summary.average_sale)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {report.sales.summary.voided_count} voided
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Daily breakdown + payment methods */}
                            <div className="grid gap-4 lg:grid-cols-3">
                                {/* Daily table */}
                                <div className="lg:col-span-2 rounded-md border">
                                    <ScrollArea className="max-h-80">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Txns</TableHead>
                                                    <TableHead className="text-right">Revenue</TableHead>
                                                    <TableHead className="text-right">Cost</TableHead>
                                                    <TableHead className="text-right">Profit</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.sales.daily.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                                                            No sales in this period.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : report.sales.daily.map((d) => (
                                                    <TableRow key={d.date}>
                                                        <TableCell className="font-mono text-sm">{formatDateOnly(d.date)}</TableCell>
                                                        <TableCell className="text-right">{d.count}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(d.revenue)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(d.cost)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(d.profit)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {report.sales.daily.length > 0 && (
                                                    <TableRow className="font-semibold bg-muted/30">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell className="text-right">{report.sales.summary.total_sales}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(report.sales.summary.total_revenue)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(report.sales.summary.total_cost)}</TableCell>
                                                        <TableCell className="text-right font-mono">{formatCurrency(report.sales.summary.total_profit)}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>

                                {/* Payment Methods + Top Products */}
                                <div className="space-y-4">
                                    <div className="rounded-md border">
                                        <div className="px-4 py-3 border-b">
                                            <p className="text-sm font-medium">By Payment Method</p>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {report.sales.by_payment_method.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No data.</p>
                                            ) : report.sales.by_payment_method.map((pm) => (
                                                <div key={pm.method} className="flex items-center justify-between text-sm">
                                                    <span className="capitalize text-muted-foreground">{pm.method}</span>
                                                    <div className="text-right">
                                                        <div className="font-mono font-medium">{formatCurrency(pm.total)}</div>
                                                        <div className="text-xs text-muted-foreground">{pm.count} txn{pm.count !== 1 ? 's' : ''}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {report.sales.top_products.length > 0 && (
                                        <div className="rounded-md border">
                                            <div className="px-4 py-3 border-b">
                                                <p className="text-sm font-medium">Top Products</p>
                                            </div>
                                            <div className="p-4 space-y-2">
                                                {report.sales.top_products.slice(0, 5).map((p) => (
                                                    <div key={p.name} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground truncate max-w-[130px]" title={p.name}>{p.name}</span>
                                                        <div className="text-right shrink-0 ml-2">
                                                            <div className="font-mono font-medium">{formatCurrency(p.revenue)}</div>
                                                            <div className="text-xs text-muted-foreground">{p.quantity_sold} sold</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Income & Expenses ─────────────────────────────── */}
                        <div>
                            <SectionHeading icon={DollarSign}>
                                Income &amp; Expenses
                            </SectionHeading>

                            <div className="grid gap-4 lg:grid-cols-2">
                                {/* Income */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                                            <TrendingUp className="h-4 w-4" />
                                            Income
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1">
                                        <LineRow label="Sales Revenue" amount={report.income.sales_revenue} />
                                        <LineRow label="Debt Payments Collected" amount={report.income.debt_payments} />

                                        {report.income.cash_receipts.total > 0 && (
                                            <div>
                                                <LineRow label="Cash Receipts" amount={report.income.cash_receipts.total} />
                                                {report.income.cash_receipts.by_category.map((c) => (
                                                    <LineRow key={c.category} label={c.category} amount={c.total} sub />
                                                ))}
                                            </div>
                                        )}

                                        {report.income.bank_inflows.total > 0 && (
                                            <div>
                                                <div className="flex justify-between py-1 text-sm">
                                                    <span className="text-muted-foreground">
                                                        Bank Inflows
                                                        <span className="text-xs ml-1 opacity-60">(incl. sale deposits)</span>
                                                    </span>
                                                    <span className="font-mono font-medium">{formatCurrency(report.income.bank_inflows.total)}</span>
                                                </div>
                                                {report.income.bank_inflows.by_account.map((a) => (
                                                    <LineRow key={a.account_name} label={a.account_name} amount={a.total} sub />
                                                ))}
                                            </div>
                                        )}

                                        <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
                                            <span>Total Income</span>
                                            <span className="font-mono text-green-700 dark:text-green-400">
                                                {formatCurrency(report.income.total)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Expenses */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2 text-destructive">
                                            <TrendingDown className="h-4 w-4" />
                                            Expenses
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1">
                                        {report.expenses.bills_paid.total > 0 && (
                                            <div>
                                                <LineRow label="Bills Paid" amount={report.expenses.bills_paid.total} />
                                                {report.expenses.bills_paid.by_category.map((c) => (
                                                    <LineRow key={c.category} label={c.category} amount={c.total} sub />
                                                ))}
                                            </div>
                                        )}

                                        {report.expenses.cash_expenses.total > 0 && (
                                            <div>
                                                <LineRow label="Cash Drawer Expenses" amount={report.expenses.cash_expenses.total} />
                                                {report.expenses.cash_expenses.by_category.map((c) => (
                                                    <LineRow key={c.category} label={c.category} amount={c.total} sub />
                                                ))}
                                            </div>
                                        )}

                                        {report.expenses.bank_outflows.total > 0 && (
                                            <div>
                                                <LineRow label="Bank Outflows" amount={report.expenses.bank_outflows.total} />
                                                {report.expenses.bank_outflows.by_account.map((a) => (
                                                    <LineRow key={a.account_name} label={a.account_name} amount={a.total} sub />
                                                ))}
                                            </div>
                                        )}

                                        <LineRow label="Internal Use (Stock Consumed)" amount={report.expenses.internal_use_cost} />

                                        <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
                                            <span>Total Expenses</span>
                                            <span className="font-mono text-destructive">
                                                {formatCurrency(report.expenses.total)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Net Income / Loss callout */}
                            {report.net_income >= 0 ? (
                                <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 flex items-center justify-between text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200">
                                    <span className="font-semibold text-lg">Net Income</span>
                                    <span className="text-2xl font-bold font-mono">{formatCurrency(report.net_income)}</span>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 flex items-center justify-between text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200">
                                    <span className="font-semibold text-lg">Net Loss</span>
                                    <span className="text-2xl font-bold font-mono">{formatCurrency(report.net_income)}</span>
                                </div>
                            )}
                        </div>

                        {/* ── Internal Use Items ────────────────────────────── */}
                        {report.internal_use.by_product.length > 0 && (
                            <div>
                                <SectionHeading icon={PackageMinus}>
                                    Internal Use Items
                                </SectionHeading>

                                {/* By-product summary table */}
                                <div className="rounded-md border">
                                    <ScrollArea>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead className="text-right">Qty Consumed</TableHead>
                                                    <TableHead className="text-right">Unit Cost</TableHead>
                                                    <TableHead className="text-right">Total Cost</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {report.internal_use.by_product.map((p, i) => (
                                                    <TableRow key={p.id ?? i}>
                                                        <TableCell className="font-medium">{p.name}</TableCell>
                                                        <TableCell className="font-mono text-sm">
                                                            {p.sku ?? <span className="text-muted-foreground">—</span>}
                                                        </TableCell>
                                                        <TableCell className="text-right">{p.total_qty}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(p.cost_price)}</TableCell>
                                                        <TableCell className="text-right font-mono text-sm">{formatCurrency(p.total_cost)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="font-semibold bg-muted/30">
                                                    <TableCell colSpan={2}>Total</TableCell>
                                                    <TableCell className="text-right">{report.internal_use.summary.total_qty_consumed}</TableCell>
                                                    <TableCell />
                                                    <TableCell className="text-right font-mono">{formatCurrency(report.internal_use.summary.total_cost)}</TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>

                                {/* Collapsible individual transactions */}
                                {report.internal_use.transactions.length > 0 && (
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowTransactions(!showTransactions)}
                                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            {showTransactions
                                                ? <ChevronUp className="h-3.5 w-3.5" />
                                                : <ChevronDown className="h-3.5 w-3.5" />}
                                            {showTransactions ? 'Hide' : 'Show'} individual transactions ({report.internal_use.transactions.length})
                                        </button>

                                        {showTransactions && (
                                            <div className="mt-2 rounded-md border">
                                                <ScrollArea>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Date</TableHead>
                                                                <TableHead>Product</TableHead>
                                                                <TableHead>Reason</TableHead>
                                                                <TableHead>By</TableHead>
                                                                <TableHead className="text-right">Qty</TableHead>
                                                                <TableHead className="text-right">Unit Cost</TableHead>
                                                                <TableHead className="text-right">Total</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {report.internal_use.transactions.map((t) => (
                                                                <TableRow key={t.id}>
                                                                    <TableCell className="font-mono text-sm whitespace-nowrap">
                                                                        {formatDate(t.date)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div>{t.product_name}</div>
                                                                        {t.product_sku && (
                                                                            <div className="text-xs text-muted-foreground font-mono">{t.product_sku}</div>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-muted-foreground">
                                                                        {t.reason ?? <span className="text-muted-foreground">—</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-sm text-muted-foreground">
                                                                        {t.user ?? <span className="text-muted-foreground">—</span>}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">{Math.abs(t.change_qty)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">{formatCurrency(t.cost_price)}</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm">
                                                                        {formatCurrency(Math.abs(t.change_qty) * t.cost_price)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </ScrollArea>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
