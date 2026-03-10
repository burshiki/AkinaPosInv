import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft } from 'lucide-react';
import type { BankAccount } from '@/types';

const ACCOUNT_TYPES = [
    { value: 'cash_drawer', label: 'Cash Drawer' },
    { value: 'gcash',       label: 'GCash' },
    { value: 'maya',        label: 'Maya' },
    { value: 'bdo',         label: 'BDO' },
    { value: 'other',       label: 'Other' },
];

interface Props {
    bankAccount: BankAccount;
}

export default function BankAccountEdit({ bankAccount }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name:           bankAccount.name,
        bank_name:      bankAccount.bank_name ?? '',
        account_number: bankAccount.account_number ?? '',
        description:    bankAccount.description ?? '',
        is_active:      bankAccount.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('bank-accounts.update', bankAccount.id));
    };

    return (
        <AuthenticatedLayout header={`Edit: ${bankAccount.bank_name || bankAccount.name}`}>
            <Head title={`Edit ${bankAccount.bank_name || bankAccount.name}`} />

            <div className="mx-auto max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('bank-accounts.show', bankAccount.id)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Edit Bank Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Account Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Bank Name</Label>
                                <Input
                                    id="bank_name"
                                    value={data.bank_name}
                                    onChange={(e) => setData('bank_name', e.target.value)}
                                    placeholder="e.g. BDO, BPI, GCash…"
                                />
                                {errors.bank_name && <p className="text-sm text-destructive">{errors.bank_name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_number">Account Number</Label>
                                <Input
                                    id="account_number"
                                    value={data.account_number}
                                    onChange={(e) => setData('account_number', e.target.value)}
                                />
                                {errors.account_number && <p className="text-sm text-destructive">{errors.account_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={2}
                                />
                                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) => setData('is_active', Boolean(checked))}
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Balance can only be changed through ledger entries (Record Entry).
                            </p>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>Save Changes</Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('bank-accounts.show', bankAccount.id)}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
