import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react';
import { useState } from 'react';
import type { BankAccount, BankAccountLedgerEntry, PaginatedData } from '@/types';

interface Props {
    bankAccount: BankAccount;
    ledgerEntries: PaginatedData<BankAccountLedgerEntry>;
}

const CATEGORIES = [
    { value: 'sale',             label: 'Sale Revenue' },
    { value: 'isp_collection',   label: 'ISP Collection' },
    { value: 'vendo_collection', label: 'Vendo Collection' },
    { value: 'expense',          label: 'Expense' },
    { value: 'adjustment',       label: 'Adjustment' },
    { value: 'other',            label: 'Other' },
];

export default function BankAccountsShow({ bankAccount, ledgerEntries }: Props) {
    const [recordOpen, setRecordOpen] = useState(false);

    const form = useForm({
        type: 'in' as 'in' | 'out',
        amount: '',
        description: '',
        category: 'other',
    });

    const openRecord = () => {
        form.reset();
        form.clearErrors();
        setRecordOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('bank-accounts.ledger.store', bankAccount.id), {
            onSuccess: () => setRecordOpen(false),
        });
    };

    return (
        <AuthenticatedLayout header={`Account: ${bankAccount.bank_name || bankAccount.name}`}>
            <Head title={bankAccount.bank_name || bankAccount.name} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('bank-accounts.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <PermissionGate permission="banking.manage">
                        <Button size="sm" onClick={openRecord}>
                            <Plus className="mr-1.5 h-4 w-4" /> Record Entry
                        </Button>
                    </PermissionGate>
                </div>

                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <h2 className="text-xl font-bold">{bankAccount.bank_name || bankAccount.name}</h2>
                            {bankAccount.account_number && (
                                <p className="text-sm text-muted-foreground">{bankAccount.account_number}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-3xl font-bold">{formatCurrency(bankAccount.balance)}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledgerEntries.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No ledger entries yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ledgerEntries.data.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm">{formatDate(entry.transacted_at)}</TableCell>
                                        <TableCell>
                                            {entry.type === 'in' ? (
                                                <Badge variant="success" className="gap-1">
                                                    <ArrowDownCircle className="h-3 w-3" /> IN
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="gap-1">
                                                    <ArrowUpCircle className="h-3 w-3" /> OUT
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{entry.category}</Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${entry.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {entry.type === 'in' ? '+' : '-'}{formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(entry.running_balance)}</TableCell>
                                        <TableCell className="text-sm">{entry.performer?.name ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination data={ledgerEntries} />
            </div>

            <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Record Entry
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-0.5">
                            <p className="text-muted-foreground">Account</p>
                            <p className="font-medium">{bankAccount.bank_name || bankAccount.name}</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={form.data.type === 'in' ? 'default' : 'outline'}
                                    className="flex-1"
                                    onClick={() => form.setData('type', 'in')}
                                >
                                    Money In
                                </Button>
                                <Button
                                    type="button"
                                    variant={form.data.type === 'out' ? 'destructive' : 'outline'}
                                    className="flex-1"
                                    onClick={() => form.setData('type', 'out')}
                                >
                                    Money Out
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.data.amount}
                                onChange={(e) => form.setData('amount', e.target.value)}
                                autoFocus
                            />
                            {form.errors.amount && <p className="text-sm text-destructive">{form.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Category</Label>
                            <Select value={form.data.category} onValueChange={(v) => form.setData('category', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.category && <p className="text-sm text-destructive">{form.errors.category}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                rows={3}
                            />
                            {form.errors.description && <p className="text-sm text-destructive">{form.errors.description}</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Recording…' : 'Record Entry'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
