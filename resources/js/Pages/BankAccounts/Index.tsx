import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency } from '@/lib/utils';
import { Eye, ArrowLeftRight, Landmark, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { BankAccount } from '@/types';

interface Props {
    bankAccounts: BankAccount[];
    totalBalance: number;
    defaultTransferFee: number;
}

export default function BankAccountsIndex({ bankAccounts, totalBalance, defaultTransferFee }: Props) {
    const confirm = useConfirm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [transferOpen, setTransferOpen] = useState(false);

    const transferForm = useForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        transfer_fee: String(defaultTransferFee),
    });

    const openTransfer = () => {
        transferForm.reset();
        transferForm.clearErrors();
        setTransferOpen(true);
    };

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post(route('bank-accounts.transfer.store'), {
            onSuccess: () => setTransferOpen(false),
        });
    };

    const form = useForm({
        name: '',
        bank_name: '',
        account_number: '',
        description: '',
        balance: '0',
        is_active: true as boolean,
    });

    const openCreate = () => {
        setEditingAccount(null);
        form.setData({ name: '', bank_name: '', account_number: '', description: '', balance: '0', is_active: true });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (account: BankAccount) => {
        setEditingAccount(account);
        form.setData({
            name: account.name,
            bank_name: account.bank_name ?? '',
            account_number: account.account_number ?? '',
            description: account.description ?? '',
            balance: String(account.balance),
            is_active: account.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccount) {
            form.put(route('bank-accounts.update', editingAccount.id), { onSuccess: () => setDialogOpen(false) });
        } else {
            form.post(route('bank-accounts.store'), { onSuccess: () => setDialogOpen(false) });
        }
    };

    const handleDelete = async (account: BankAccount) => {
        const hasHistory = account.ledger_entries_count && account.ledger_entries_count > 0;
        const ok = await confirm({
            title: hasHistory ? 'Deactivate Account' : 'Delete Account',
            description: hasHistory
                ? `"${account.bank_name || account.name}" has ledger history — it will be deactivated instead. Continue?`
                : `Delete "${account.bank_name || account.name}"?`,
            confirmLabel: hasHistory ? 'Deactivate' : 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('bank-accounts.destroy', account.id));
    };

    const active   = bankAccounts.filter((a) => a.is_active);
    const inactive = bankAccounts.filter((a) => !a.is_active);

    return (
        <AuthenticatedLayout>
            <Head title="Bank Accounts" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Landmark className="h-6 w-6" />
                        Bank Accounts
                    </h1>
                    <div className="flex gap-2">
                        <PermissionGate permission="banking.manage">
                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Add Account
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission="banking.transfer">
                            <Button variant="outline" onClick={openTransfer}>
                                <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer Funds
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Total balance summary */}
                <Card className="w-auto self-start">
                    <CardContent className="flex items-center gap-3 p-4">
                        <Landmark className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Total Balance</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {active.map((account) => (
                        <Card key={account.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{account.bank_name || account.name}</CardTitle>
                                </div>
                                {account.account_number && (
                                    <p className="text-sm text-muted-foreground">{account.account_number}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{formatCurrency(account.balance)}</div>
                                {account.description && (
                                    <p className="mt-1 text-xs text-muted-foreground">{account.description}</p>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild className="flex-1">
                                    <Link href={route('bank-accounts.show', account.id)}>
                                        <Eye className="mr-1 h-3 w-3" /> Ledger
                                    </Link>
                                </Button>
                                <PermissionGate permission="banking.manage">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(account)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(account)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </PermissionGate>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {inactive.length > 0 && (
                    <div>
                        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Inactive Accounts</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                            {inactive.map((account) => (
                                <Card key={account.id} className="border-dashed">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">{account.bank_name || account.name}</CardTitle>
                                            <Badge variant="secondary">Inactive</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xl font-semibold">{formatCurrency(account.balance)}</div>
                                    </CardContent>
                                    <CardFooter className="flex gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('bank-accounts.show', account.id)}>
                                                <Eye className="mr-1 h-3 w-3" /> Ledger
                                            </Link>
                                        </Button>
                                        <PermissionGate permission="banking.manage">
                                            <Button variant="ghost" size="sm" onClick={() => openEdit(account)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </PermissionGate>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" /> Transfer Funds
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>From Account</Label>
                            <Select
                                value={transferForm.data.from_account_id}
                                onValueChange={(v) => transferForm.setData('from_account_id', v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger>
                                <SelectContent>
                                    {bankAccounts
                                        .filter((a) => a.is_active && String(a.id) !== transferForm.data.to_account_id)
                                        .map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.bank_name || a.name} ({formatCurrency(a.balance)})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {transferForm.errors.from_account_id && <p className="text-sm text-destructive">{transferForm.errors.from_account_id}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label>To Account</Label>
                            <Select
                                value={transferForm.data.to_account_id}
                                onValueChange={(v) => transferForm.setData('to_account_id', v)}
                            >
                                <SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger>
                                <SelectContent>
                                    {bankAccounts
                                        .filter((a) => a.is_active && String(a.id) !== transferForm.data.from_account_id)
                                        .map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.bank_name || a.name} ({formatCurrency(a.balance)})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {transferForm.errors.to_account_id && <p className="text-sm text-destructive">{transferForm.errors.to_account_id}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="transfer_amount">Amount</Label>
                            <Input
                                id="transfer_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={transferForm.data.amount}
                                onChange={(e) => transferForm.setData('amount', e.target.value)}
                                autoFocus
                            />
                            {transferForm.data.from_account_id && (() => {
                                const src = bankAccounts.find((a) => String(a.id) === transferForm.data.from_account_id);
                                return src ? <p className="text-xs text-muted-foreground">Available: {formatCurrency(src.balance)}</p> : null;
                            })()}
                            {transferForm.errors.amount && <p className="text-sm text-destructive">{transferForm.errors.amount}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="transfer_fee">Transfer Fee</Label>
                            <Input
                                id="transfer_fee"
                                type="number"
                                step="0.01"
                                min="0"
                                value={transferForm.data.transfer_fee}
                                onChange={(e) => transferForm.setData('transfer_fee', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Deducted from source account (e.g. GCash bank-out fee). Saved as default.
                            </p>
                            {transferForm.errors.transfer_fee && <p className="text-sm text-destructive">{transferForm.errors.transfer_fee}</p>}
                        </div>

                        {(() => {
                            const amt = parseFloat(transferForm.data.amount) || 0;
                            const fee = parseFloat(transferForm.data.transfer_fee) || 0;
                            if (amt <= 0 && fee <= 0) return null;
                            const src = bankAccounts.find((a) => String(a.id) === transferForm.data.from_account_id);
                            return (
                                <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Transfer amount</span>
                                        <span>{formatCurrency(amt)}</span>
                                    </div>
                                    {fee > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Transfer fee</span>
                                            <span>{formatCurrency(fee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                        <span>Total deducted from {src?.bank_name || src?.name || 'source'}</span>
                                        <span>{formatCurrency(amt + fee)}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={transferForm.processing || !transferForm.data.from_account_id || !transferForm.data.to_account_id || !transferForm.data.amount}
                            >
                                {transferForm.processing ? 'Transferring…' : 'Transfer'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? `Edit: ${editingAccount.bank_name || editingAccount.name}` : 'New Bank Account'}</DialogTitle>
                    </DialogHeader>
                    <form id="bank-account-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ba_name">Account Name *</Label>
                            <Input id="ba_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                            {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ba_bank_name">Bank Name</Label>
                            <Input id="ba_bank_name" value={form.data.bank_name} onChange={(e) => form.setData('bank_name', e.target.value)} placeholder="e.g. BDO, BPI, GCash…" />
                            {form.errors.bank_name && <p className="text-sm text-destructive">{form.errors.bank_name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ba_acctno">Account Number</Label>
                            <Input id="ba_acctno" value={form.data.account_number} onChange={(e) => form.setData('account_number', e.target.value)} />
                        </div>
                        {!editingAccount && (
                            <div className="space-y-2">
                                <Label htmlFor="ba_balance">Opening Balance</Label>
                                <Input id="ba_balance" type="number" step="0.01" min="0" value={form.data.balance} onChange={(e) => form.setData('balance', e.target.value)} />
                                <p className="text-xs text-muted-foreground">Balance can only be changed through ledger entries after creation.</p>
                                {form.errors.balance && <p className="text-sm text-destructive">{form.errors.balance}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="ba_desc">Description</Label>
                            <Textarea id="ba_desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="ba_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', !!v)} />
                            <Label htmlFor="ba_active">Active</Label>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="bank-account-form" disabled={form.processing}>
                            {form.processing ? 'Saving...' : editingAccount ? 'Save Changes' : 'Create Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
