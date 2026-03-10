import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { Supplier } from '@/types';

interface LineItem {
    description: string;
    quantity: string;
    unit_price: string;
}

const emptyLine = (): LineItem => ({
    description: '',
    quantity: '1',
    unit_price: '0',
});

interface Props {
    suppliers: Supplier[];
}

export default function BillCreate({ suppliers }: Props) {
    const form = useForm({
        supplier_id: '' as string,
        supplier_name: '',
        category: '' as string,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        tax_amount: '0',
        notes: '',
        items: [emptyLine()] as LineItem[],
    });

    const updateItem = (index: number, field: keyof LineItem, value: string) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], [field]: value };
        form.setData('items', items);
    };

    const addLine = () => form.setData('items', [...form.data.items, emptyLine()]);
    const removeLine = (index: number) => {
        if (form.data.items.length === 1) return;
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    };

    const subtotal = form.data.items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
        0
    );
    const taxAmount = parseFloat(form.data.tax_amount) || 0;
    const total = subtotal + taxAmount;

    const handleSupplierChange = (value: string) => {
        form.setData('supplier_id', value);
        const supplier = suppliers.find((s) => String(s.id) === value);
        if (supplier) {
            form.setData('supplier_name', supplier.name);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('bills.store'));
    };

    const errorsForItem = (index: number, field: string) => {
        const key = `items.${index}.${field}` as keyof typeof form.errors;
        return form.errors[key] as string | undefined;
    };

    return (
        <AuthenticatedLayout header="Create Bill">
            <Head title="Create Bill" />

            <div className="mx-auto max-w-3xl">
                <Button variant="ghost" size="sm" className="mb-4" asChild>
                    <Link href={route('bills.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
                    </Link>
                </Button>

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Bill Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Supplier</Label>
                                    <Select value={form.data.supplier_id} onValueChange={handleSupplierChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Supplier Name *</Label>
                                    <Input
                                        value={form.data.supplier_name}
                                        onChange={(e) => form.setData('supplier_name', e.target.value)}
                                        placeholder="Enter supplier name"
                                    />
                                    {form.errors.supplier_name && <p className="text-sm text-destructive">{form.errors.supplier_name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select value={form.data.category} onValueChange={(v) => form.setData('category', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="purchase_order">Purchase Order</SelectItem>
                                            <SelectItem value="rent">Rent</SelectItem>
                                            <SelectItem value="utilities">Utilities</SelectItem>
                                            <SelectItem value="internet">Internet</SelectItem>
                                            <SelectItem value="supplies">Supplies</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.category && <p className="text-sm text-destructive">{form.errors.category}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Bill Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.data.bill_date}
                                        onChange={(e) => form.setData('bill_date', e.target.value)}
                                    />
                                    {form.errors.bill_date && <p className="text-sm text-destructive">{form.errors.bill_date}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.data.due_date}
                                        onChange={(e) => form.setData('due_date', e.target.value)}
                                    />
                                    {form.errors.due_date && <p className="text-sm text-destructive">{form.errors.due_date}</p>}
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="space-y-2">
                                <Label>Line Items</Label>
                                <div className="space-y-2">
                                    {form.data.items.map((item, index) => (
                                        <div key={index} className="flex items-start gap-2">
                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Description"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                />
                                                {errorsForItem(index, 'description') && (
                                                    <p className="text-sm text-destructive">{errorsForItem(index, 'description')}</p>
                                                )}
                                            </div>
                                            <div className="w-20">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qty"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-28">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="Unit Price"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                                                />
                                            </div>
                                            <div className="w-24 pt-2 text-right text-sm font-medium">
                                                {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeLine(index)}
                                                disabled={form.data.items.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Line
                                </Button>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span>Tax</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.data.tax_amount}
                                            onChange={(e) => form.setData('tax_amount', e.target.value)}
                                            className="w-28 text-right"
                                        />
                                    </div>
                                    <div className="flex justify-between border-t pt-2 font-bold">
                                        <span>Total</span>
                                        <span>{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Optional notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? 'Creating...' : 'Create Bill'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
