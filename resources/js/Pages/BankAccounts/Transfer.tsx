import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import type { BankAccount } from '@/types';

interface Props {
    bankAccounts: BankAccount[];
    defaultTransferFee: number;
}

export default function Transfer({ bankAccounts, defaultTransferFee }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        transfer_fee: String(defaultTransferFee),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('bank-accounts.transfer.store'));
    };

    const fromAccount = bankAccounts.find((a) => String(a.id) === data.from_account_id);
    const toAccount = bankAccounts.find((a) => String(a.id) === data.to_account_id);

    const parsedAmount = parseFloat(data.amount) || 0;
    const parsedFee = parseFloat(data.transfer_fee) || 0;
    const totalDeducted = parsedAmount + parsedFee;

    return (
        <AuthenticatedLayout header="Transfer Funds">
            <Head title="Transfer Funds" />

            <div className="mx-auto max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('bank-accounts.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" />
                            Inter-Account Transfer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>From Account</Label>
                                <Select value={data.from_account_id} onValueChange={(v) => setData('from_account_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Source account" /></SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts
                                            .filter((a) => String(a.id) !== data.to_account_id)
                                            .map((a) => (
                                                <SelectItem key={a.id} value={String(a.id)}>
                                                    {a.name} ({formatCurrency(a.balance)})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {errors.from_account_id && <p className="text-sm text-destructive">{errors.from_account_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>To Account</Label>
                                <Select value={data.to_account_id} onValueChange={(v) => setData('to_account_id', v)}>
                                    <SelectTrigger><SelectValue placeholder="Destination account" /></SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts
                                            .filter((a) => String(a.id) !== data.from_account_id)
                                            .map((a) => (
                                                <SelectItem key={a.id} value={String(a.id)}>
                                                    {a.name} ({formatCurrency(a.balance)})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {errors.to_account_id && <p className="text-sm text-destructive">{errors.to_account_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                />
                                {fromAccount && (
                                    <p className="text-xs text-muted-foreground">Available: {formatCurrency(fromAccount.balance)}</p>
                                )}
                                {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transfer_fee">Transfer Fee</Label>
                                <Input
                                    id="transfer_fee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={data.transfer_fee}
                                    onChange={(e) => setData('transfer_fee', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Fee deducted from the source account (e.g. GCash bank-out fee). Saved as default for next transfer.
                                </p>
                                {errors.transfer_fee && <p className="text-sm text-destructive">{errors.transfer_fee}</p>}
                            </div>

                            {(parsedAmount > 0 || parsedFee > 0) && (
                                <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Transfer amount</span>
                                        <span>{formatCurrency(parsedAmount)}</span>
                                    </div>
                                    {parsedFee > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Transfer fee</span>
                                            <span>{formatCurrency(parsedFee)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                        <span>Total deducted from {fromAccount?.name ?? 'source'}</span>
                                        <span>{formatCurrency(totalDeducted)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('bank-accounts.index')}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={processing || !data.from_account_id || !data.to_account_id || !data.amount}>
                                    {processing ? 'Transferring...' : 'Transfer'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
