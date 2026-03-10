import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye, Search, DollarSign, AlertCircle, AlertTriangle, ArrowDown, ArrowUp, ArrowRightLeft, Wallet, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { BankAccount, CashDrawerSession, PaginatedData, PageProps } from '@/types';

interface Summary {
    cash_sales_total: number;
    total_transactions: number;
    total_change_given: number;
    transfers_to_bank: number;
    transfers_from_bank: number;
    petty_cash_expenses: number;
    cash_receipts_total: number;
    cash_debt_payments_total: number;
    online_debt_payments_total: number;
    expected_cash: number;
}

interface Props {
    sessions: PaginatedData<CashDrawerSession>;
    filters: { search?: string; status?: string; date_from?: string; date_to?: string };
    openSession: CashDrawerSession | null;
    summary: Summary | null;
    bankAccounts: BankAccount[];
}

export default function CashDrawerIndex({ sessions, filters, openSession, summary, bankAccounts }: Props) {
    const { auth } = usePage<PageProps>().props;
    const confirm = useConfirm();

    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const debouncedSearch = useDebounce(search, 300);

    // Open drawer modal
    const [openDialogOpen, setOpenDialogOpen] = useState(false);
    const [openingBalance, setOpeningBalance] = useState('0');
    const [openingNotes, setOpeningNotes] = useState('');
    const [openProcessing, setOpenProcessing] = useState(false);

    // Close drawer modal
    const [closeDialogOpen, setCloseDialogOpen] = useState(false);
    const [closingBalance, setClosingBalance] = useState('');
    const [closingNotes, setClosingNotes] = useState('');
    const [closeProcessing, setCloseProcessing] = useState(false);

    // Transfer funds modal
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [transferDirection, setTransferDirection] = useState<'drawer_to_bank' | 'bank_to_drawer'>('drawer_to_bank');
    const [transferBankId, setTransferBankId] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [transferProcessing, setTransferProcessing] = useState(false);

    // Expense modal
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [expenseCategory, setExpenseCategory] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseProcessing, setExpenseProcessing] = useState(false);

    // Cash In modal
    const [cashInDialogOpen, setCashInDialogOpen] = useState(false);
    const [cashInCategory, setCashInCategory] = useState('');
    const [cashInAmount, setCashInAmount] = useState('');
    const [cashInDescription, setCashInDescription] = useState('');
    const [cashInProcessing, setCashInProcessing] = useState(false);

    const closingNum = parseFloat(closingBalance) || 0;
    const difference = summary ? closingNum - summary.expected_cash : 0;

    useEffect(() => {
        router.get(
            route('cash-drawer.index'),
            {
                search: debouncedSearch || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleDateFilter = () => {
        router.get(
            route('cash-drawer.index'),
            {
                search: search || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleOpenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setOpenProcessing(true);
        router.post(
            route('cash-drawer.store'),
            { opening_balance: openingBalance, opening_notes: openingNotes || null },
            {
                onSuccess: () => { setOpenProcessing(false); setOpenDialogOpen(false); },
                onError: () => setOpenProcessing(false),
            }
        );
    };

    const handleCloseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const ok = await confirm({
            title: 'Close Cash Drawer',
            description: 'Are you sure you want to close this session? This action cannot be undone.',
            confirmLabel: 'Close Drawer',
            variant: 'destructive',
        });
        if (!ok) return;
        setCloseProcessing(true);
        router.post(
            route('cash-drawer.close.store'),
            { closing_balance: closingBalance, closing_notes: closingNotes || null },
            {
                onSuccess: () => { setCloseProcessing(false); setCloseDialogOpen(false); },
                onError: () => setCloseProcessing(false),
            }
        );
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTransferProcessing(true);
        router.post(
            route('cash-drawer.transfer'),
            {
                bank_account_id: transferBankId,
                direction: transferDirection,
                amount: transferAmount,
                notes: transferNotes || null,
            },
            {
                onSuccess: () => { setTransferProcessing(false); setTransferDialogOpen(false); },
                onError: () => setTransferProcessing(false),
            }
        );
    };

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setExpenseProcessing(true);
        router.post(
            route('cash-drawer.expense'),
            { category: expenseCategory, amount: expenseAmount, description: expenseDescription },
            {
                onSuccess: () => { setExpenseProcessing(false); setExpenseDialogOpen(false); setExpenseCategory(''); setExpenseAmount(''); setExpenseDescription(''); },
                onError: () => setExpenseProcessing(false),
            }
        );
    };

    const handleCashInSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCashInProcessing(true);
        router.post(
            route('cash-drawer.cash-in'),
            { category: cashInCategory, amount: cashInAmount, description: cashInDescription },
            {
                onSuccess: () => { setCashInProcessing(false); setCashInDialogOpen(false); setCashInCategory(''); setCashInAmount(''); setCashInDescription(''); },
                onError: () => setCashInProcessing(false),
            }
        );
    };

    const isOwner = openSession?.user_id === auth.user?.id;

    return (
        <AuthenticatedLayout header="Cash Drawer Sessions">
            <Head title="Cash Drawer Sessions" />

            <div className="space-y-4">
                {/* Current session status bar */}
                <div className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${openSession ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-muted bg-muted/40'}`}>
                    <div className="flex items-center gap-3">
                        {openSession ? (
                            <>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-green-800 dark:text-green-300">Session Open</p>
                                    <p className="text-sm text-green-700 dark:text-green-400">
                                        Opened by <span className="font-medium">{openSession.user?.name}</span> at {new Date(openSession.opened_at).toLocaleString()} · Opening: {formatCurrency(openSession.opening_balance)}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold">No Open Session</p>
                                    <p className="text-sm text-muted-foreground">Open the cash drawer before processing sales.</p>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {openSession ? (
                            <>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={route('sales.create')}>Go to Sales</Link>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setExpenseCategory(''); setExpenseAmount(''); setExpenseDescription(''); setExpenseDialogOpen(true); }}
                                >
                                    <Wallet className="mr-2 h-4 w-4" /> Record Expense
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setCashInCategory(''); setCashInAmount(''); setCashInDescription(''); setCashInDialogOpen(true); }}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" /> Cash In
                                </Button>
                                {isOwner && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setTransferDirection('drawer_to_bank'); setTransferBankId(''); setTransferAmount(''); setTransferNotes(''); setTransferDialogOpen(true); }}
                                    >
                                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Transfer Funds
                                    </Button>
                                )}
                                {isOwner && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => { setClosingBalance(''); setClosingNotes(''); setCloseDialogOpen(true); }}
                                    >
                                        Close Drawer
                                    </Button>
                                )}
                            </>
                        ) : (
                            <Button size="sm" onClick={() => { setOpeningBalance('0'); setOpeningNotes(''); setOpenDialogOpen(true); }}>
                                <DollarSign className="mr-2 h-4 w-4" /> Open Drawer
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filter row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by cashier name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                        <span className="text-muted-foreground">to</span>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                        <Button variant="outline" size="sm" onClick={handleDateFilter}>Filter</Button>
                    </div>
                </div>

                {/* Sessions table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead>Opened</TableHead>
                                <TableHead>Closed</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right">Closing</TableHead>
                                <TableHead className="text-right">Difference</TableHead>
                                <TableHead>Txns</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sessions.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                                        No cash drawer sessions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sessions.data.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className="font-mono">{session.id}</TableCell>
                                        <TableCell>{session.user?.name ?? '—'}</TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(session.opened_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {session.closed_at ? new Date(session.closed_at).toLocaleString() : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(session.opening_balance)}</TableCell>
                                        <TableCell className="text-right">
                                            {session.closing_balance !== null ? formatCurrency(session.closing_balance) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {session.difference !== null ? (
                                                <span className={
                                                    Math.abs(session.difference) < 0.01
                                                        ? 'text-green-600'
                                                        : session.difference > 0
                                                          ? 'text-blue-600'
                                                          : 'text-red-600'
                                                }>
                                                    {session.difference > 0 && '+'}
                                                    {formatCurrency(session.difference)}
                                                </span>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">{session.total_transactions}</TableCell>
                                        <TableCell>
                                            <Badge variant={session.status === 'open' ? 'success' : 'secondary'}>
                                                {session.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link href={route('cash-drawer.show', session.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {sessions.last_page > 1 && <Pagination data={sessions} />}
            </div>

            {/* Open Drawer Dialog */}
            <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" /> Open Cash Drawer
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Count the cash currently in the drawer and enter the opening amount.
                    </p>
                    <form id="open-drawer-form" onSubmit={handleOpenSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="od_balance">Opening Balance *</Label>
                            <Input
                                id="od_balance"
                                type="number"
                                min="0"
                                step="0.01"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="od_notes">Notes (optional)</Label>
                            <Textarea
                                id="od_notes"
                                value={openingNotes}
                                onChange={(e) => setOpeningNotes(e.target.value)}
                                placeholder="Any notes about the opening..."
                                rows={3}
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="open-drawer-form" disabled={openProcessing}>
                            {openProcessing ? 'Opening...' : 'Open Cash Drawer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Drawer Dialog */}
            <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Close Cash Drawer</DialogTitle>
                    </DialogHeader>
                    {summary && openSession && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs uppercase text-muted-foreground">Opening Balance</p>
                                    <p className="text-lg font-bold">{formatCurrency(openSession.opening_balance)}</p>
                                </div>
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs uppercase text-muted-foreground">Cash Sales</p>
                                    <p className="text-lg font-bold text-green-600">
                                        <ArrowUp className="mr-1 inline h-4 w-4" />
                                        {formatCurrency(summary.cash_sales_total)}
                                    </p>
                                </div>
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs uppercase text-muted-foreground">Change Given</p>
                                    <p className="text-lg font-bold text-red-600">
                                        <ArrowDown className="mr-1 inline h-4 w-4" />
                                        {formatCurrency(summary.total_change_given)}
                                    </p>
                                </div>
                                <div className="rounded-md border p-3 text-center">
                                    <p className="text-xs uppercase text-muted-foreground">Transactions</p>
                                    <p className="text-lg font-bold">{summary.total_transactions}</p>
                                </div>
                                {summary.transfers_to_bank > 0 && (
                                    <div className="rounded-md border p-3 text-center">
                                        <p className="text-xs uppercase text-muted-foreground">Transferred to Bank</p>
                                        <p className="text-lg font-bold text-orange-600">
                                            <ArrowDown className="mr-1 inline h-4 w-4" />
                                            {formatCurrency(summary.transfers_to_bank)}
                                        </p>
                                    </div>
                                )}
                                {summary.transfers_from_bank > 0 && (
                                    <div className="rounded-md border p-3 text-center">
                                        <p className="text-xs uppercase text-muted-foreground">Transferred from Bank</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            <ArrowUp className="mr-1 inline h-4 w-4" />
                                            {formatCurrency(summary.transfers_from_bank)}
                                        </p>
                                    </div>
                                )}
                                {summary.cash_debt_payments_total > 0 && (
                                    <div className="rounded-md border p-3 text-center">
                                        <p className="text-xs uppercase text-muted-foreground">Debt Payments (Cash)</p>
                                        <p className="text-lg font-bold text-green-600">
                                            <ArrowUp className="mr-1 inline h-4 w-4" />
                                            {formatCurrency(summary.cash_debt_payments_total)}
                                        </p>
                                    </div>
                                )}
                                {summary.cash_receipts_total > 0 && (
                                    <div className="rounded-md border p-3 text-center">
                                        <p className="text-xs uppercase text-muted-foreground">Cash Receipts (In)</p>
                                        <p className="text-lg font-bold text-teal-600">
                                            <ArrowUp className="mr-1 inline h-4 w-4" />
                                            {formatCurrency(summary.cash_receipts_total)}
                                        </p>
                                    </div>
                                )}
                                {summary.online_debt_payments_total > 0 && (
                                    <div className="rounded-md border p-3 text-center">
                                        <p className="text-xs uppercase text-muted-foreground">Debt Payments (Online)</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            <ArrowUp className="mr-1 inline h-4 w-4" />
                                            {formatCurrency(summary.online_debt_payments_total)}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-muted p-3">
                                <span className="font-medium">Expected Cash in Drawer:</span>
                                <span className="text-lg font-bold">{formatCurrency(summary.expected_cash)}</span>
                            </div>
                            <Separator />
                            <form id="close-drawer-form" onSubmit={handleCloseSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cd_balance">Actual Cash in Drawer *</Label>
                                    <Input
                                        id="cd_balance"
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
                                    <div className={`flex items-center gap-2 rounded-md p-3 ${
                                        Math.abs(difference) < 0.01
                                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                            : difference > 0
                                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                    }`}>
                                        {Math.abs(difference) >= 0.01 && <AlertTriangle className="h-4 w-4 shrink-0" />}
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
                                    <Label htmlFor="cd_notes">Closing Notes (optional)</Label>
                                    <Textarea
                                        id="cd_notes"
                                        value={closingNotes}
                                        onChange={(e) => setClosingNotes(e.target.value)}
                                        placeholder="Any notes about the closing..."
                                        rows={2}
                                    />
                                </div>
                            </form>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            form="close-drawer-form"
                            variant="destructive"
                            disabled={closeProcessing || !closingBalance}
                        >
                            {closeProcessing ? 'Closing...' : 'Close Cash Drawer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Transfer Funds Dialog */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5" /> Transfer Funds
                        </DialogTitle>
                    </DialogHeader>
                    {summary && (
                        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">Current cash in drawer</span>
                            <span className="font-semibold tabular-nums">{formatCurrency(summary.expected_cash)}</span>
                        </div>
                    )}
                    <form id="transfer-form" onSubmit={handleTransferSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Direction</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                        transferDirection === 'drawer_to_bank'
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-input bg-background hover:bg-accent'
                                    }`}
                                    onClick={() => setTransferDirection('drawer_to_bank')}
                                >
                                    <ArrowDown className="h-4 w-4" /> Drawer → Bank
                                </button>
                                <button
                                    type="button"
                                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                                        transferDirection === 'bank_to_drawer'
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-input bg-background hover:bg-accent'
                                    }`}
                                    onClick={() => setTransferDirection('bank_to_drawer')}
                                >
                                    <ArrowUp className="h-4 w-4" /> Bank → Drawer
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tr_bank">Bank Account *</Label>
                            <Select value={transferBankId} onValueChange={setTransferBankId}>
                                <SelectTrigger id="tr_bank">
                                    <SelectValue placeholder="Select account…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map((acc) => (
                                        <SelectItem key={acc.id} value={String(acc.id)}>
                                            {acc.bank_name || acc.name} — {formatCurrency(acc.balance)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tr_amount">Amount *</Label>
                            <Input
                                id="tr_amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tr_notes">Notes (optional)</Label>
                            <Input
                                id="tr_notes"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder="Reason for transfer…"
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            form="transfer-form"
                            disabled={transferProcessing || !transferBankId || !transferAmount}
                        >
                            {transferProcessing ? 'Transferring...' : 'Transfer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Expense Dialog */}
            <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" /> Record Petty Cash Expense
                        </DialogTitle>
                    </DialogHeader>
                    <form id="expense-form-idx" onSubmit={handleExpenseSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="exp_cat">Category *</Label>
                            <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                <SelectTrigger id="exp_cat">
                                    <SelectValue placeholder="Select category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="food">Food &amp; Beverages</SelectItem>
                                    <SelectItem value="transport">Transportation</SelectItem>
                                    <SelectItem value="supplies">Supplies</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="utilities">Utilities</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exp_amt">Amount *</Label>
                            <Input
                                id="exp_amt"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exp_desc">Description *</Label>
                            <Input
                                id="exp_desc"
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                                placeholder="What was this expense for?"
                                required
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            form="expense-form-idx"
                            disabled={expenseProcessing || !expenseCategory || !expenseAmount || !expenseDescription}
                        >
                            {expenseProcessing ? 'Saving...' : 'Record Expense'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cash In Dialog */}
            <Dialog open={cashInDialogOpen} onOpenChange={setCashInDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlusCircle className="h-5 w-5" /> Cash In — Miscellaneous Receipt
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Record non-sale cash received (e.g. ISP collections, service fees).
                    </p>
                    <form id="cashin-form-idx" onSubmit={handleCashInSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ci_cat">Category *</Label>
                            <Select value={cashInCategory} onValueChange={setCashInCategory}>
                                <SelectTrigger id="ci_cat">
                                    <SelectValue placeholder="Select category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="isp_collection">ISP Collection</SelectItem>
                                    <SelectItem value="wifi_vendo_collection">Wifi Vendo Collection</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ci_amt">Amount *</Label>
                            <Input
                                id="ci_amt"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={cashInAmount}
                                onChange={(e) => setCashInAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ci_desc">Description *</Label>
                            <Input
                                id="ci_desc"
                                value={cashInDescription}
                                onChange={(e) => setCashInDescription(e.target.value)}
                                placeholder="e.g. ISP payment from John Doe"
                                required
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCashInDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            form="cashin-form-idx"
                            disabled={cashInProcessing || !cashInCategory || !cashInAmount || !cashInDescription}
                        >
                            {cashInProcessing ? 'Saving...' : 'Record Cash In'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
