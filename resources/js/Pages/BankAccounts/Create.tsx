import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { ArrowLeft } from 'lucide-react';

const ACCOUNT_TYPES = [
    { value: 'cash_drawer', label: 'Cash Drawer' },
    { value: 'gcash',       label: 'GCash' },
    { value: 'maya',        label: 'Maya' },
    { value: 'bdo',         label: 'BDO' },
    { value: 'other',       label: 'Other' },
];

export default function BankAccountCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name:           '',
        type:           'cash_drawer',
        account_number: '',
        description:    '',
        balance:        '0',
        is_active:      true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('bank-accounts.store'));
    };

    return (
        <AuthenticatedLayout header="New Bank Account">
            <Head title="New Bank Account" />

            <div className="mx-auto max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('bank-accounts.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Bank Account Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Account Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g. Cash Drawer, BPI Savings…"
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type *</Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_number">Account Number</Label>
                                <Input
                                    id="account_number"
                                    value={data.account_number}
                                    onChange={(e) => setData('account_number', e.target.value)}
                                    placeholder="e.g. 09XX-XXXX-XXXX"
                                />
                                {errors.account_number && <p className="text-sm text-destructive">{errors.account_number}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="balance">Opening Balance (₱)</Label>
                                <Input
                                    id="balance"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.balance}
                                    onChange={(e) => setData('balance', e.target.value)}
                                />
                                {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}
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

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>Create Account</Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('bank-accounts.index')}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
