import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { Bill, BankAccount, CashDrawerSession } from '@/types';

interface Props {
    bill: Bill;
    bankAccounts: BankAccount[];
    openSession: CashDrawerSession | null;
}

export default function BillPay({ bill, bankAccounts, openSession }: Props) {
    const form = useForm({
        payment_method: '' as string,
        amount: String(bill.balance),
        bank_account_id: '' as string,
        check_number: '',
        check_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
    });

    const method = form.data.payment_method;
    const showBankField = ['check', 'bank_transfer', 'online'].includes(method);
    const showCheckField = method === 'check';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('bills.pay.store', bill.id));
    };

    return (
        <AuthenticatedLayout header={`Pay Bill ${bill.bill_number}`}>
            <Head title={`Pay Bill ${bill.bill_number}`} />

            <div className="mx-auto max-w-lg">
                <Button variant="ghost" size="sm" className="mb-4" asChild>
                    <Link href={route('bills.show', bill.id)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bill
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Record Payment</CardTitle>
                        <div className="text-sm text-muted-foreground">
                            {bill.supplier_name} &middot; Balance: <span className="font-bold text-red-600">{formatCurrency(bill.balance)}</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Payment Method *</Label>
                                <Select value={form.data.payment_method} onValueChange={(v) => form.setData('payment_method', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash" disabled={!openSession}>
                                            Cash {!openSession ? '(No open drawer)' : ''}
                                        </SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="online">Online</SelectItem>
                                    </SelectContent>
                                </Select>
                                {form.errors.payment_method && <p className="text-sm text-destructive">{form.errors.payment_method}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Amount *</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    max={bill.balance}
                                    step="0.01"
                                    value={form.data.amount}
                                    onChange={(e) => form.setData('amount', e.target.value)}
                                />
                                {form.errors.amount && <p className="text-sm text-destructive">{form.errors.amount}</p>}
                            </div>

                            {showBankField && (
                                <div className="space-y-2">
                                    <Label>Bank Account *</Label>
                                    <Select value={form.data.bank_account_id} onValueChange={(v) => form.setData('bank_account_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((ba) => (
                                                <SelectItem key={ba.id} value={String(ba.id)}>
                                                    {ba.bank_name || ba.name} ({formatCurrency(ba.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.bank_account_id && <p className="text-sm text-destructive">{form.errors.bank_account_id}</p>}
                                </div>
                            )}

                            {showCheckField && (
                                <div className="space-y-2">
                                    <Label>Check Number</Label>
                                    <Input
                                        value={form.data.check_number}
                                        onChange={(e) => form.setData('check_number', e.target.value)}
                                        placeholder="Check #"
                                    />
                                </div>
                            )}

                            {showCheckField && (
                                <div className="space-y-2">
                                    <Label>Check Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.data.check_date}
                                        onChange={(e) => form.setData('check_date', e.target.value)}
                                    />
                                    {form.data.check_date > new Date().toISOString().split('T')[0] && (
                                        <p className="text-xs text-amber-600">Post-dated check — dated {form.data.check_date}</p>
                                    )}
                                    {form.errors.check_date && <p className="text-sm text-destructive">{form.errors.check_date}</p>}
                                </div>
                            )}

                            {(method === 'bank_transfer' || method === 'online') && (
                                <div className="space-y-2">
                                    <Label>Reference Number</Label>
                                    <Input
                                        value={form.data.reference_number}
                                        onChange={(e) => form.setData('reference_number', e.target.value)}
                                        placeholder="Reference #"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Optional notes..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? 'Processing...' : `Pay ${formatCurrency(parseFloat(form.data.amount) || 0)}`}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
