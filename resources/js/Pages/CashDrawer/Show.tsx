import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ArrowDown, ArrowUp, ReceiptText, Wallet, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import type { CashDrawerSession, CashDrawerTransfer, CashDrawerExpense, CashDrawerReceipt, DebtPayment, Sale } from '@/types';

interface Summary {
    cash_sales_total: number;
    total_sales_all: number;
    total_change_given: number;
    transfers_to_bank: number;
    transfers_from_bank: number;
    petty_cash_total: number;
    bank_expense_total: number;
    cash_receipts_total: number;
    cash_debt_payments_total: number;
    online_debt_payments_total: number;
    expected_cash: number;
}

interface Props {
    session: CashDrawerSession;
    sales: Sale[];
    transfers: CashDrawerTransfer[];
    expenses: CashDrawerExpense[];
    receipts: CashDrawerReceipt[];
    debtPayments: DebtPayment[];
    summary: Summary;
}

const EXPENSE_CATEGORIES = [
    { value: 'food', label: 'Food & Beverages' },
    { value: 'transport', label: 'Transportation' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'other', label: 'Other' },
] as const;

function fmt(d: string) {
    return new Date(d).toLocaleString();
}

export default function CashDrawerShow({ session, sales, transfers, expenses, receipts, debtPayments, summary }: Props) {
    const difference = session.difference ?? 0;

    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [cashInDialogOpen, setCashInDialogOpen] = useState(false);

    const expenseForm = useForm({
        category: '',
        amount: '',
        description: '',
    });

    const cashInForm = useForm({
        category: '',
        amount: '',
        description: '',
    });

    function submitExpense(e: React.FormEvent) {
        e.preventDefault();
        expenseForm.post(route('cash-drawer.expense'), {
            preserveScroll: true,
            onSuccess: () => {
                setExpenseDialogOpen(false);
                expenseForm.reset();
            },
        });
    }

    function submitCashIn(e: React.FormEvent) {
        e.preventDefault();
        cashInForm.post(route('cash-drawer.cash-in'), {
            preserveScroll: true,
            onSuccess: () => {
                setCashInDialogOpen(false);
                cashInForm.reset();
            },
        });
    }

    return (
        <AuthenticatedLayout header={`Cash Drawer Session #${session.id}`}>
            <Head title={`Cash Drawer #${session.id}`} />

            {/* Screen-only controls */}
            <div className="mx-auto max-w-3xl space-y-4 print:hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('cash-drawer.index')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sessions
                            </Link>
                        </Button>
                        <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
                            {session.status.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {session.status === 'open' && (
                            <Button variant="outline" size="sm" onClick={() => setExpenseDialogOpen(true)}>
                                <Wallet className="mr-2 h-4 w-4" /> Record Expense
                            </Button>
                        )}
                        {session.status === 'open' && (
                            <Button variant="outline" size="sm" onClick={() => setCashInDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Cash In
                            </Button>
                        )}
                        {session.status === 'closed' && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('reports.show', 'z-report') + '?date=' + session.opened_at.split('T')[0]}>
                                    <ReceiptText className="mr-2 h-4 w-4" /> View Z-Report
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Session Details Card */}
                <Card>
                    <CardHeader><CardTitle>Session Details</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Cashier</p>
                                <p className="font-medium">{session.user?.name ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Opened At</p>
                                <p className="font-medium">{fmt(session.opened_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase">Closed At</p>
                                <p className="font-medium">{session.closed_at ? fmt(session.closed_at) : '—'}</p>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Opening</p>
                                <p className="text-lg font-bold">{formatCurrency(session.opening_balance)}</p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Cash Sales</p>
                                <p className="text-lg font-bold text-green-600">{formatCurrency(session.cash_sales_total)}</p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Expected</p>
                                <p className="text-lg font-bold">
                                    {formatCurrency(summary.expected_cash)}
                                </p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Closing</p>
                                <p className="text-lg font-bold">
                                    {session.closing_balance !== null ? formatCurrency(session.closing_balance) : '—'}
                                </p>
                            </div>
                        </div>

                        {session.status === 'closed' && session.difference !== null && (
                            <>
                                <Separator className="my-4" />
                                <div className={`rounded-md p-3 text-center ${
                                    Math.abs(difference) < 0.01
                                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                        : difference > 0
                                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                }`}>
                                    <p className="text-xs uppercase opacity-75">Difference</p>
                                    <p className="text-xl font-bold">
                                        {Math.abs(difference) < 0.01
                                            ? 'Balanced'
                                            : difference > 0
                                              ? `+${formatCurrency(difference)} (Over)`
                                              : `${formatCurrency(difference)} (Short)`}
                                    </p>
                                </div>
                            </>
                        )}

                        {(session.opening_notes || session.closing_notes) && (
                            <>
                                <Separator className="my-4" />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {session.opening_notes && (
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase">Opening Notes</p>
                                            <p className="text-sm">{session.opening_notes}</p>
                                        </div>
                                    )}
                                    {session.closing_notes && (
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase">Closing Notes</p>
                                            <p className="text-sm">{session.closing_notes}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Transfers Card */}
                {transfers.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Fund Transfers ({transfers.length})</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Direction</TableHead>
                                        <TableHead>Bank Account</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transfers.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="text-sm">{fmt(t.created_at)}</TableCell>
                                            <TableCell>
                                                {t.direction === 'drawer_to_bank' ? (
                                                    <span className="flex items-center gap-1 text-orange-600 text-sm">
                                                        <ArrowDown className="h-3.5 w-3.5" /> Drawer → Bank
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-blue-600 text-sm">
                                                        <ArrowUp className="h-3.5 w-3.5" /> Bank → Drawer
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{t.bank_account?.name ?? '—'}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{t.notes ?? '—'}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Cash Receipts (Cash In) Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Cash Receipts / Cash In ({receipts.length})</CardTitle>
                            {receipts.length > 0 && (
                                <span className="text-sm font-semibold text-teal-600">
                                    Total: {formatCurrency(summary.cash_receipts_total)}
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receipts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            No cash receipts recorded
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    receipts.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="text-sm">{fmt(r.created_at)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{r.category.replace('_', ' ')}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{r.description}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {r.performer?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-teal-600">
                                                + {formatCurrency(r.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Petty Cash Expenses Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Petty Cash Expenses ({expenses.length})</CardTitle>
                            {expenses.length > 0 && (
                                <div className="flex gap-3 text-sm font-semibold">
                                    {summary.petty_cash_total > 0 && (
                                        <span className="text-red-600">Cash: {formatCurrency(summary.petty_cash_total)}</span>
                                    )}
                                    {summary.bank_expense_total > 0 && (
                                        <span className="text-blue-600">Bank/GCash: {formatCurrency(summary.bank_expense_total)}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Via</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                                            No petty cash expenses recorded
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((exp) => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="text-sm">{fmt(exp.created_at)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{exp.category}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {exp.payment_method ? (
                                                    <span className="text-blue-600 font-medium">{exp.payment_method}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Cash</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{exp.description}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {exp.performer?.name ?? '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${exp.payment_method ? 'text-blue-600' : 'text-red-600'}`}>
                                                − {formatCurrency(exp.amount)}
                                                {exp.payment_method && <span className="ml-1 text-xs text-muted-foreground">(no cash impact)</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Debt Payments Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Debt Payments ({debtPayments.length})</CardTitle>
                            {debtPayments.length > 0 && (
                                <div className="flex gap-4 text-sm font-semibold">
                                    {summary.cash_debt_payments_total > 0 && (
                                        <span className="text-green-600">Cash: {formatCurrency(summary.cash_debt_payments_total)}</span>
                                    )}
                                    {summary.online_debt_payments_total > 0 && (
                                        <span className="text-blue-600">Online: {formatCurrency(summary.online_debt_payments_total)}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debtPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                            No debt payments in this session
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    debtPayments.map((dp) => (
                                        <TableRow key={dp.id}>
                                            <TableCell className="text-sm">{fmt(dp.paid_at)}</TableCell>
                                            <TableCell className="text-sm">{dp.customer_debt?.customer_name ?? '—'}</TableCell>
                                            <TableCell>
                                                <span className={`text-xs font-medium capitalize ${
                                                    dp.payment_method === 'cash' ? 'text-green-600' : 'text-blue-600'
                                                }`}>
                                                    {dp.payment_method}
                                                </span>
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${
                                                dp.payment_method === 'cash' ? 'text-green-600' : 'text-blue-600'
                                            }`}>
                                                + {formatCurrency(dp.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Sales Card */}
                <Card>
                    <CardHeader><CardTitle>Sales ({sales.length})</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Receipt #</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            No sales in this session
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell>
                                                <Link href={route('sales.show', sale.id)}
                                                    className="font-mono font-medium text-primary hover:underline">
                                                    {sale.receipt_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-sm">{fmt(sale.sold_at)}</TableCell>
                                            <TableCell className="text-sm">{sale.customer_name || '—'}</TableCell>
                                            <TableCell><Badge variant="outline">{sale.payment_method}</Badge></TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        {sales.length > 0 && (
                            <div className="border-t px-4 py-3 text-right text-sm font-semibold">
                                Total Sales: {formatCurrency(summary.total_sales_all)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center text-xs text-muted-foreground">
                    Total transactions: {session.total_transactions}
                </div>
            </div>

            {/* ── PRINTABLE REPORT ──────────────────────────────── */}
            <div className="hidden print:block p-6 text-black text-sm font-sans">

                {/* Header */}
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold">Cash Drawer Session Report</h1>
                    <p className="text-base">Session #{session.id} · {session.status.toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-1">Printed: {new Date().toLocaleString()}</p>
                </div>

                {/* Session info */}
                <div className="mb-4 grid grid-cols-3 gap-4 border rounded p-3">
                    <div>
                        <p className="text-xs uppercase text-gray-500">Cashier</p>
                        <p className="font-semibold">{session.user?.name ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-gray-500">Opened</p>
                        <p className="font-semibold">{fmt(session.opened_at)}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase text-gray-500">Closed</p>
                        <p className="font-semibold">{session.closed_at ? fmt(session.closed_at) : '—'}</p>
                    </div>
                </div>

                {/* Financial Summary */}
                <h2 className="font-bold text-base mb-2 border-b pb-1">Financial Summary</h2>
                <table className="w-full mb-4">
                    <tbody>
                        <tr className="border-b">
                            <td className="py-1 text-gray-600">Opening Balance</td>
                            <td className="py-1 text-right font-medium">{formatCurrency(session.opening_balance)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-1 text-gray-600">Cash Sales</td>
                            <td className="py-1 text-right font-medium">+ {formatCurrency(summary.cash_sales_total)}</td>
                        </tr>
                        <tr className="border-b">
                            <td className="py-1 text-gray-600">Change Given</td>
                            <td className="py-1 text-right font-medium">− {formatCurrency(summary.total_change_given)}</td>
                        </tr>
                        {summary.transfers_to_bank > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Transferred to Bank</td>
                                <td className="py-1 text-right font-medium">− {formatCurrency(summary.transfers_to_bank)}</td>
                            </tr>
                        )}
                        {summary.transfers_from_bank > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Transferred from Bank</td>
                                <td className="py-1 text-right font-medium">+ {formatCurrency(summary.transfers_from_bank)}</td>
                            </tr>
                        )}
                        {summary.petty_cash_total > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Petty Cash Expenses</td>
                                <td className="py-1 text-right font-medium">− {formatCurrency(summary.petty_cash_total)}</td>
                            </tr>
                        )}
                        {summary.cash_receipts_total > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Cash Receipts (In)</td>
                                <td className="py-1 text-right font-medium">+ {formatCurrency(summary.cash_receipts_total)}</td>
                            </tr>
                        )}
                        {summary.cash_debt_payments_total > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Debt Payments (Cash)</td>
                                <td className="py-1 text-right font-medium">+ {formatCurrency(summary.cash_debt_payments_total)}</td>
                            </tr>
                        )}
                        {summary.online_debt_payments_total > 0 && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Debt Payments (Online)</td>
                                <td className="py-1 text-right font-medium text-gray-500">{formatCurrency(summary.online_debt_payments_total)} (to bank)</td>
                            </tr>
                        )}
                        <tr className="border-b font-semibold">
                            <td className="py-1.5">Expected Cash in Drawer</td>
                            <td className="py-1.5 text-right">{formatCurrency(summary.expected_cash)}</td>
                        </tr>
                        {session.closing_balance !== null && (
                            <tr className="border-b">
                                <td className="py-1 text-gray-600">Actual Closing Count</td>
                                <td className="py-1 text-right font-medium">{formatCurrency(session.closing_balance)}</td>
                            </tr>
                        )}
                        {session.difference !== null && (
                            <tr className={`font-bold ${
                                Math.abs(difference) < 0.01 ? '' : difference > 0 ? 'text-blue-700' : 'text-red-700'
                            }`}>
                                <td className="py-1.5">Difference</td>
                                <td className="py-1.5 text-right">
                                    {Math.abs(difference) < 0.01
                                        ? 'Balanced ✓'
                                        : difference > 0
                                          ? `+${formatCurrency(difference)} (Over)`
                                          : `${formatCurrency(difference)} (Short)`}
                                </td>
                            </tr>
                        )}
                        <tr className="border-t">
                            <td className="py-1 text-gray-600">Total Transactions</td>
                            <td className="py-1 text-right font-medium">{session.total_transactions}</td>
                        </tr>
                        <tr>
                            <td className="py-1 text-gray-600">Total Sales (all methods)</td>
                            <td className="py-1 text-right font-medium">{formatCurrency(summary.total_sales_all)}</td>
                        </tr>
                    </tbody>
                </table>

                {(session.opening_notes || session.closing_notes) && (
                    <div className="mb-4 grid grid-cols-2 gap-4">
                        {session.opening_notes && (
                            <div>
                                <p className="text-xs uppercase text-gray-500">Opening Notes</p>
                                <p>{session.opening_notes}</p>
                            </div>
                        )}
                        {session.closing_notes && (
                            <div>
                                <p className="text-xs uppercase text-gray-500">Closing Notes</p>
                                <p>{session.closing_notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Fund Transfers */}
                {transfers.length > 0 && (
                    <>
                        <h2 className="font-bold text-base mb-2 border-b pb-1">Fund Transfers</h2>
                        <table className="w-full mb-4 border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="py-1 text-left font-semibold">Time</th>
                                    <th className="py-1 text-left font-semibold">Direction</th>
                                    <th className="py-1 text-left font-semibold">Bank Account</th>
                                    <th className="py-1 text-left font-semibold">Notes</th>
                                    <th className="py-1 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfers.map((t) => (
                                    <tr key={t.id} className="border-b">
                                        <td className="py-1">{fmt(t.created_at)}</td>
                                        <td className="py-1">
                                            {t.direction === 'drawer_to_bank' ? 'Drawer → Bank' : 'Bank → Drawer'}
                                        </td>
                                        <td className="py-1">{t.bank_account?.name ?? '—'}</td>
                                        <td className="py-1 text-gray-500">{t.notes ?? '—'}</td>
                                        <td className="py-1 text-right">{formatCurrency(t.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* Petty Cash Expenses */}
                {expenses.length > 0 && (
                    <>
                        <h2 className="font-bold text-base mb-2 border-b pb-1">Petty Cash Expenses</h2>
                        <table className="w-full mb-4 border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="py-1 text-left font-semibold">Time</th>
                                    <th className="py-1 text-left font-semibold">Category</th>
                                    <th className="py-1 text-left font-semibold">Via</th>
                                    <th className="py-1 text-left font-semibold">Description</th>
                                    <th className="py-1 text-left font-semibold">By</th>
                                    <th className="py-1 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="border-b">
                                        <td className="py-1">{fmt(exp.created_at)}</td>
                                        <td className="py-1 capitalize">{exp.category}</td>
                                        <td className="py-1">{exp.payment_method ?? 'Cash'}</td>
                                        <td className="py-1">{exp.description}</td>
                                        <td className="py-1 text-gray-500">{exp.performer?.name ?? '—'}</td>
                                        <td className="py-1 text-right">
                                            {formatCurrency(exp.amount)}
                                            {exp.payment_method && ' *'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {summary.petty_cash_total > 0 && (
                                    <tr className="border-t">
                                        <td colSpan={5} className="py-1">Cash Expenses</td>
                                        <td className="py-1 text-right">{formatCurrency(summary.petty_cash_total)}</td>
                                    </tr>
                                )}
                                {summary.bank_expense_total > 0 && (
                                    <tr className="border-t">
                                        <td colSpan={5} className="py-1">Bank/GCash Expenses *</td>
                                        <td className="py-1 text-right">{formatCurrency(summary.bank_expense_total)}</td>
                                    </tr>
                                )}
                                <tr className="border-t font-bold">
                                    <td colSpan={5} className="py-1.5">Total Cash Expenses</td>
                                    <td className="py-1.5 text-right">{formatCurrency(summary.petty_cash_total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                        {summary.bank_expense_total > 0 && (
                            <p className="text-xs text-gray-400 mb-4">* Bank/GCash expenses do not affect cash drawer balance.</p>
                        )}
                    </>
                )}

                {/* Debt Payments */}
                {debtPayments.length > 0 && (
                    <>
                        <h2 className="font-bold text-base mb-2 border-b pb-1">Debt Payments ({debtPayments.length})</h2>
                        <table className="w-full mb-4 border-collapse">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="py-1 text-left font-semibold">Time</th>
                                    <th className="py-1 text-left font-semibold">Customer</th>
                                    <th className="py-1 text-left font-semibold">Method</th>
                                    <th className="py-1 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {debtPayments.map((dp) => (
                                    <tr key={dp.id} className="border-b">
                                        <td className="py-1">{fmt(dp.paid_at)}</td>
                                        <td className="py-1">{dp.customer_debt?.customer_name ?? '—'}</td>
                                        <td className="py-1 capitalize">{dp.payment_method}</td>
                                        <td className="py-1 text-right">{formatCurrency(dp.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                {summary.cash_debt_payments_total > 0 && (
                                    <tr className="border-t">
                                        <td colSpan={3} className="py-1">Cash Debt Payments</td>
                                        <td className="py-1 text-right">{formatCurrency(summary.cash_debt_payments_total)}</td>
                                    </tr>
                                )}
                                {summary.online_debt_payments_total > 0 && (
                                    <tr className="border-t">
                                        <td colSpan={3} className="py-1">Online Debt Payments</td>
                                        <td className="py-1 text-right">{formatCurrency(summary.online_debt_payments_total)}</td>
                                    </tr>
                                )}
                                <tr className="border-t font-bold">
                                    <td colSpan={3} className="py-1.5">Total Debt Payments</td>
                                    <td className="py-1.5 text-right">{formatCurrency(summary.cash_debt_payments_total + summary.online_debt_payments_total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </>
                )}

                {/* Sales */}
                <h2 className="font-bold text-base mb-2 border-b pb-1">Sales ({sales.length})</h2>
                {sales.length === 0 ? (
                    <p className="text-gray-500 mb-4">No sales recorded in this session.</p>
                ) : (
                    <table className="w-full mb-2 border-collapse">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="py-1 text-left font-semibold">Receipt #</th>
                                <th className="py-1 text-left font-semibold">Time</th>
                                <th className="py-1 text-left font-semibold">Customer</th>
                                <th className="py-1 text-left font-semibold">Payment</th>
                                <th className="py-1 text-right font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map((sale) => (
                                <tr key={sale.id} className="border-b">
                                    <td className="py-1 font-mono">{sale.receipt_number}</td>
                                    <td className="py-1">{fmt(sale.sold_at)}</td>
                                    <td className="py-1">{sale.customer_name || '—'}</td>
                                    <td className="py-1 capitalize">{sale.payment_method}</td>
                                    <td className="py-1 text-right">{formatCurrency(sale.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t font-bold">
                                <td colSpan={4} className="py-1.5">Grand Total</td>
                                <td className="py-1.5 text-right">{formatCurrency(summary.total_sales_all)}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}

                {/* Footer */}
                <div className="mt-8 border-t pt-3 text-xs text-gray-400 text-center">
                    Generated by POS System · Session #{session.id} · {new Date().toLocaleString()}
                </div>
            </div>

            {/* ── Record Expense Dialog ─────────────────────────── */}
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Petty Cash Expense</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitExpense} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="exp-category">Category</Label>
                            <Select
                                value={expenseForm.data.category}
                                onValueChange={(v) => expenseForm.setData('category', v)}
                            >
                                <SelectTrigger id="exp-category">
                                    <SelectValue placeholder="Select category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EXPENSE_CATEGORIES.map((c) => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {expenseForm.errors.category && (
                                <p className="text-xs text-destructive">{expenseForm.errors.category}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="exp-amount">Amount</Label>
                            <Input
                                id="exp-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={expenseForm.data.amount}
                                onChange={(e) => expenseForm.setData('amount', e.target.value)}
                            />
                            {expenseForm.errors.amount && (
                                <p className="text-xs text-destructive">{expenseForm.errors.amount}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="exp-description">Description</Label>
                            <Input
                                id="exp-description"
                                placeholder="What was the expense for?"
                                value={expenseForm.data.description}
                                onChange={(e) => expenseForm.setData('description', e.target.value)}
                            />
                            {expenseForm.errors.description && (
                                <p className="text-xs text-destructive">{expenseForm.errors.description}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={expenseForm.processing}>
                                {expenseForm.processing ? 'Saving…' : 'Record Expense'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Cash In Dialog ─────────────────────────────────── */}
            <Dialog open={cashInDialogOpen} onOpenChange={setCashInDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" /> Cash In — Miscellaneous Receipt
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Record non-sale cash received (e.g. ISP collections, service fees).
                    </p>
                    <form onSubmit={submitCashIn} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="ci-category">Category</Label>
                            <Select
                                value={cashInForm.data.category}
                                onValueChange={(v) => cashInForm.setData('category', v)}
                            >
                                <SelectTrigger id="ci-category">
                                    <SelectValue placeholder="Select category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="isp_collection">ISP Collection</SelectItem>
                                    <SelectItem value="wifi_vendo_collection">Wifi Vendo Collection</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            {cashInForm.errors.category && (
                                <p className="text-xs text-destructive">{cashInForm.errors.category}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ci-amount">Amount</Label>
                            <Input
                                id="ci-amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={cashInForm.data.amount}
                                onChange={(e) => cashInForm.setData('amount', e.target.value)}
                            />
                            {cashInForm.errors.amount && (
                                <p className="text-xs text-destructive">{cashInForm.errors.amount}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ci-description">Description</Label>
                            <Input
                                id="ci-description"
                                placeholder="e.g. ISP payment from John Doe"
                                value={cashInForm.data.description}
                                onChange={(e) => cashInForm.setData('description', e.target.value)}
                            />
                            {cashInForm.errors.description && (
                                <p className="text-xs text-destructive">{cashInForm.errors.description}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCashInDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={cashInForm.processing}>
                                {cashInForm.processing ? 'Saving…' : 'Record Cash In'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
