import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Product, Supplier } from '@/types';

interface Props {
    products: Product[];
    suppliers: Supplier[];
}

interface LineItem {
    product_id: string;
    product_name: string;
    quantity_ordered: string;
    unit_cost: string;
    notes: string;
}

const emptyLine = (): LineItem => ({
    product_id: '',
    product_name: '',
    quantity_ordered: '1',
    unit_cost: '0',
    notes: '',
});

export default function PurchaseOrderCreate({ products, suppliers }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        notes: '',
        items: [emptyLine()] as LineItem[],
    });

    const updateItem = (index: number, field: keyof LineItem, value: string) => {
        const items = [...data.items];
        items[index] = { ...items[index], [field]: value };

        // Auto-fill product name and cost when product is selected
        if (field === 'product_id' && value) {
            const product = products.find((p) => String(p.id) === value);
            if (product) {
                items[index].product_name = product.name;
                items[index].unit_cost = String(product.cost_price);
            }
        }

        setData('items', items);
    };

    const addLine = () => setData('items', [...data.items, emptyLine()]);

    const removeLine = (index: number) => {
        if (data.items.length === 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    };

    const subtotal = data.items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0),
        0
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('purchase-orders.store'));
    };

    const errorsForItem = (index: number, field: string) => {
        const key = `items.${index}.${field}` as keyof typeof errors;
        return errors[key] as string | undefined;
    };

    return (
        <AuthenticatedLayout header="New Purchase Order">
            <Head title="New Purchase Order" />

            <div className="space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('purchase-orders.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Supplier Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier_id">Select Supplier *</Label>
                                <Select
                                    value={data.supplier_id}
                                    onValueChange={(v) => setData('supplier_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a supplier…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                                {s.contact_person ? ` — ${s.contact_person}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.supplier_id && (
                                    <p className="text-sm text-destructive">{errors.supplier_id}</p>
                                )}
                                {suppliers.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No active suppliers.{' '}
                                        <Link href={route('suppliers.create')} className="underline">
                                            Add one first.
                                        </Link>
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {errors.items && (
                                <p className="text-sm text-destructive">{errors.items as string}</p>
                            )}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product (optional)</TableHead>
                                            <TableHead>Item Name *</TableHead>
                                            <TableHead className="w-28 text-right">Qty *</TableHead>
                                            <TableHead className="w-32 text-right">Unit Cost *</TableHead>
                                            <TableHead className="w-32 text-right">Subtotal</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Select
                                                        value={item.product_id || 'none'}
                                                        onValueChange={(v) =>
                                                            updateItem(index, 'product_id', v === 'none' ? '' : v)
                                                        }
                                                    >
                                                        <SelectTrigger className="w-48">
                                                            <SelectValue placeholder="Select product" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">— None —</SelectItem>
                                                            {products.map((p) => (
                                                                <SelectItem key={p.id} value={String(p.id)}>
                                                                    {p.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.product_name}
                                                        onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                                        placeholder="Item name"
                                                    />
                                                    {errorsForItem(index, 'product_name') && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {errorsForItem(index, 'product_name')}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        className="text-right"
                                                        value={item.quantity_ordered}
                                                        onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="text-right"
                                                        value={item.unit_cost}
                                                        onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(
                                                        (parseFloat(item.quantity_ordered) || 0) *
                                                        (parseFloat(item.unit_cost) || 0)
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeLine(index)}
                                                        disabled={data.items.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                <Plus className="mr-2 h-4 w-4" /> Add Line
                            </Button>

                            <Separator />

                            <div className="flex justify-end">
                                <div className="space-y-1 text-right">
                                    <p className="text-sm text-muted-foreground">Order Total</p>
                                    <p className="text-2xl font-bold">{formatCurrency(subtotal)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={processing}>
                            Save Draft
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('purchase-orders.index')}>Cancel</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
