import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import type { BankAccount } from '@/types';
import { FormEvent } from 'react';

interface Props {
    customerName: string;
    totalOutstanding: number;
    cashDrawerOpen: boolean;
    bankAccounts: BankAccount[];
}

export default function RecordPayment({ customerName, totalOutstanding, cashDrawerOpen, bankAccounts }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        customer_name: customerName,
        amount: '',
        payment_method: 'cash',
        bank_account_id: '',
        notes: '',
    });

    const isCash = data.payment_method === 'cash';
    const canSubmit = isCash ? cashDrawerOpen : data.bank_account_id !== '';

    function handleMethodChange(value: string) {
        setData('payment_method', value);
        setData('bank_account_id', '');
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('debt-payments.store'));
    }

    return (
        <AuthenticatedLayout header="Record Debt Payment">
            <Head title="Record Debt Payment" />

            <div className="max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('debts.show', customerName)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {customerName}
                    </Link>
                </Button>

                {isCash && !cashDrawerOpen && (
                    <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Cash drawer is not open. Please open the cash drawer before recording a cash payment.
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Payment for {customerName}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Outstanding Balance: <span className="font-bold text-red-600">{formatCurrency(totalOutstanding)}</span>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={totalOutstanding}
                                    value={data.amount}
                                    onChange={e => setData('amount', e.target.value)}
                                    placeholder="0.00"
                                />
                                {errors.amount && (
                                    <p className="text-sm text-destructive">{errors.amount}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Maximum: {formatCurrency(totalOutstanding)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_method">Payment Method *</Label>
                                <Select value={data.payment_method} onValueChange={handleMethodChange}>
                                    <SelectTrigger id="payment_method">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="online">Online / E-Wallet</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.payment_method && (
                                    <p className="text-sm text-destructive">{errors.payment_method}</p>
                                )}
                            </div>

                            {!isCash && (
                                <div className="space-y-2">
                                    <Label htmlFor="bank_account_id">Deposit To *</Label>
                                    <Select
                                        value={data.bank_account_id}
                                        onValueChange={(value) => setData('bank_account_id', value)}
                                    >
                                        <SelectTrigger id="bank_account_id">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((account) => (
                                                <SelectItem key={account.id} value={String(account.id)}>
                                                    {account.name} ({formatCurrency(account.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.bank_account_id && (
                                        <p className="text-sm text-destructive">{errors.bank_account_id}</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Optional payment notes..."
                                    rows={3}
                                />
                                {errors.notes && (
                                    <p className="text-sm text-destructive">{errors.notes}</p>
                                )}
                            </div>

                            <Button type="submit" disabled={processing || !canSubmit} className="w-full">
                                {processing ? 'Processing...' : 'Record Payment'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
