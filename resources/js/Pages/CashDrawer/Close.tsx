import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { CashDrawerSession } from '@/types';

interface Props {
    session: CashDrawerSession;
    summary: {
        cash_sales_total: number;
        total_transactions: number;
        total_change_given: number;
        transfers_to_bank: number;
        transfers_from_bank: number;
        petty_cash_expenses: number;
        bank_expense_total: number;
        cash_receipts_total: number;
        cash_debt_payments_total: number;
        online_debt_payments_total: number;
        expected_cash: number;
    };
}

export default function CashDrawerClose({ session, summary }: Props) {
    const confirm = useConfirm();
    const [closingBalance, setClosingBalance] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const closingNum = parseFloat(closingBalance) || 0;
    const difference = closingNum - summary.expected_cash;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const ok = await confirm({
            title: 'Close Cash Drawer',
            description: 'Are you sure you want to close this cash drawer session? This action cannot be undone.',
            confirmLabel: 'Close Drawer',
            variant: 'destructive',
        });
        if (!ok) return;

        setProcessing(true);

        router.post(
            route('cash-drawer.close.store'),
            {
                closing_balance: closingBalance,
                closing_notes: notes || null,
            },
            {
                onSuccess: () => setProcessing(false),
                onError: () => setProcessing(false),
            }
        );
    };

    return (
        <AuthenticatedLayout header="Close Cash Drawer">
            <Head title="Close Cash Drawer" />

            <div className="mx-auto max-w-lg space-y-4">
                {/* Session Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Session Summary</CardTitle>
                        <CardDescription>
                            Opened by {session.user?.name} at {new Date(session.opened_at).toLocaleString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Opening Balance</p>
                                <p className="text-lg font-bold">{formatCurrency(session.opening_balance)}</p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Cash Sales</p>
                                <p className="text-lg font-bold text-green-600">
                                    <ArrowUp className="inline h-4 w-4 mr-1" />
                                    {formatCurrency(summary.cash_sales_total)}
                                </p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Change Given</p>
                                <p className="text-lg font-bold text-red-600">
                                    <ArrowDown className="inline h-4 w-4 mr-1" />
                                    {formatCurrency(summary.total_change_given)}
                                </p>
                            </div>
                            <div className="rounded-md border p-3 text-center">
                                <p className="text-xs text-muted-foreground uppercase">Total Transactions</p>
                                <p className="text-lg font-bold">{summary.total_transactions}</p>
                            </div>
                            {summary.transfers_to_bank > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Transferred to Bank</p>
                                    <p className="text-lg font-bold text-orange-600">
                                        <ArrowDown className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.transfers_to_bank)}
                                    </p>
                                </div>
                            )}
                            {summary.transfers_from_bank > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Transferred from Bank</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        <ArrowUp className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.transfers_from_bank)}
                                    </p>
                                </div>
                            )}
                            {summary.cash_debt_payments_total > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Debt Payments (Cash)</p>
                                    <p className="text-lg font-bold text-green-600">
                                        <ArrowUp className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.cash_debt_payments_total)}
                                    </p>
                                </div>
                            )}
                            {summary.online_debt_payments_total > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Debt Payments (Online)</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        <ArrowUp className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.online_debt_payments_total)}
                                    </p>
                                </div>
                            )}
                            {summary.cash_receipts_total > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Cash Receipts (In)</p>
                                    <p className="text-lg font-bold text-teal-600">
                                        <ArrowUp className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.cash_receipts_total)}
                                    </p>
                                </div>
                            )}
                            {summary.petty_cash_expenses > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Petty Cash Expenses</p>
                                    <p className="text-lg font-bold text-red-600">
                                        <ArrowDown className="inline h-4 w-4 mr-1" />
                                        {formatCurrency(summary.petty_cash_expenses)}
                                    </p>
                                </div>
                            )}
                            {summary.bank_expense_total > 0 && (
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs text-muted-foreground uppercase">Bank/GCash Expenses</p>
                                    <p className="text-lg font-bold text-blue-600">
                                        {formatCurrency(summary.bank_expense_total)}
                                        <span className="ml-1 text-xs font-normal text-muted-foreground">(no cash impact)</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between rounded-md bg-muted p-3">
                            <span className="font-medium">Expected Cash in Drawer:</span>
                            <span className="text-lg font-bold">{formatCurrency(summary.expected_cash)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Close Drawer Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <DollarSign className="h-5 w-5" />
                            Close Cash Drawer
                        </CardTitle>
                        <CardDescription>
                            Count the cash in the drawer and enter the actual amount below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="closing_balance">Actual Cash in Drawer *</Label>
                                <Input
                                    id="closing_balance"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={closingBalance}
                                    onChange={(e) => setClosingBalance(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            {closingBalance && (
                                <div
                                    className={`flex items-center gap-2 rounded-md p-3 ${
                                        Math.abs(difference) < 0.01
                                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                            : difference > 0
                                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                    }`}
                                >
                                    {Math.abs(difference) >= 0.01 && (
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-medium">
                                            {Math.abs(difference) < 0.01
                                                ? 'Cash balanced!'
                                                : difference > 0
                                                  ? `Over by ${formatCurrency(difference)}`
                                                  : `Short by ${formatCurrency(Math.abs(difference))}`}
                                        </p>
                                        <p className="text-xs opacity-75">
                                            Expected: {formatCurrency(summary.expected_cash)} | Actual: {formatCurrency(closingNum)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="notes">Closing Notes (optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any notes about the closing..."
                                    rows={3}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                variant="destructive"
                                disabled={processing || !closingBalance}
                            >
                                {processing ? 'Closing...' : 'Close Cash Drawer'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
