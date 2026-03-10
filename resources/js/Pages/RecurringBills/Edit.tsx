import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft } from 'lucide-react';
import type { RecurringBillTemplate, Supplier } from '@/types';

interface Props {
    template: RecurringBillTemplate;
    suppliers: Supplier[];
}

export default function RecurringBillEdit({ template, suppliers }: Props) {
    const form = useForm({
        name: template.name,
        supplier_id: template.supplier_id ? String(template.supplier_id) : '',
        supplier_name: template.supplier_name ?? '',
        category: template.category,
        amount: String(template.amount),
        frequency: template.frequency,
        day_of_month: String(template.day_of_month),
        due_day_of_month: String(template.due_day_of_month),
        start_date: template.start_date?.split('T')[0] ?? '',
        end_date: template.end_date?.split('T')[0] ?? '',
        notes: template.notes ?? '',
    });

    const handleSupplierChange = (value: string) => {
        form.setData('supplier_id', value);
        const supplier = suppliers.find((s) => String(s.id) === value);
        if (supplier) form.setData('supplier_name', supplier.name);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(route('recurring-bills.update', template.id));
    };

    return (
        <AuthenticatedLayout header="Edit Recurring Bill">
            <Head title="Edit Recurring Bill" />

            <div className="mx-auto max-w-lg">
                <Button variant="ghost" size="sm" className="mb-4" asChild>
                    <Link href={route('recurring-bills.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Template</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                                {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supplier</Label>
                                    <Select value={form.data.supplier_id} onValueChange={handleSupplierChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Optional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select value={form.data.category} onValueChange={(v) => form.setData('category', v as typeof form.data.category)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rent">Rent</SelectItem>
                                            <SelectItem value="utilities">Utilities</SelectItem>
                                            <SelectItem value="internet">Internet</SelectItem>
                                            <SelectItem value="supplies">Supplies</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.category && <p className="text-sm text-destructive">{form.errors.category}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Amount *</Label>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.data.amount}
                                        onChange={(e) => form.setData('amount', e.target.value)}
                                    />
                                    {form.errors.amount && <p className="text-sm text-destructive">{form.errors.amount}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Frequency *</Label>
                                    <Select value={form.data.frequency} onValueChange={(v) => form.setData('frequency', v as typeof form.data.frequency)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="quarterly">Quarterly</SelectItem>
                                            <SelectItem value="annually">Annually</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.frequency && <p className="text-sm text-destructive">{form.errors.frequency}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Day of Month (1-28) *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={form.data.day_of_month}
                                        onChange={(e) => form.setData('day_of_month', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Day of Month (1-28) *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="28"
                                        value={form.data.due_day_of_month}
                                        onChange={(e) => form.setData('due_day_of_month', e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">Bill will be due on the {form.data.due_day_of_month ? `${form.data.due_day_of_month}${['st','nd','rd'][+form.data.due_day_of_month-1] ?? 'th'}` : '—'} of each period.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={form.data.start_date}
                                        onChange={(e) => form.setData('start_date', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={form.data.end_date}
                                        onChange={(e) => form.setData('end_date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
