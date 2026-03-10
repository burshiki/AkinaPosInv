import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { ArrowLeft } from 'lucide-react';
import type { BankAccount } from '@/types';

interface Props {
    bankAccount: BankAccount;
}

export default function RecordEntry({ bankAccount }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        type: 'in' as 'in' | 'out',
        amount: '',
        description: '',
        category: 'other',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('bank-accounts.ledger.store', bankAccount.id));
    };

    const categories = [
        { value: 'sale', label: 'Sale Revenue' },
        { value: 'isp_collection', label: 'ISP Collection' },
        { value: 'vendo_collection', label: 'Vendo Collection' },
        { value: 'expense', label: 'Expense' },
        { value: 'adjustment', label: 'Adjustment' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <AuthenticatedLayout header="Record Entry">
            <Head title="Record Entry" />

            <div className="mx-auto max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('bank-accounts.show', bankAccount.id)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to {bankAccount.bank_name || bankAccount.name}
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Record Entry - {bankAccount.bank_name || bankAccount.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={data.type === 'in' ? 'default' : 'outline'}
                                        className="flex-1"
                                        onClick={() => setData('type', 'in')}
                                    >
                                        Money In
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={data.type === 'out' ? 'destructive' : 'outline'}
                                        className="flex-1"
                                        onClick={() => setData('type', 'out')}
                                    >
                                        Money Out
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                />
                                {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={3}
                                />
                                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={route('bank-accounts.show', bankAccount.id)}>Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing ? 'Recording...' : 'Record Entry'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
