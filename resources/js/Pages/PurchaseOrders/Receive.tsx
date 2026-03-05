import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types';

interface Props {
    order: PurchaseOrder;
}

interface ReceiveItem {
    id: number;
    quantity_received: string;
}

export default function PurchaseOrderReceive({ order }: Props) {
    const items = order.items ?? [];

    const { data, setData, post, processing, errors } = useForm({
        shipping_fee: '',
        notes: '',
        items: items.map((item) => ({
            id: item.id,
            quantity_received: String(item.quantity_ordered - item.quantity_received), // default: receive all remaining
        })) as ReceiveItem[],
    });

    const updateQty = (index: number, value: string) => {
        const updated = [...data.items];
        updated[index] = { ...updated[index], quantity_received: value };
        setData('items', updated);
    };

    const remaining = (item: PurchaseOrderItem) =>
        item.quantity_ordered - item.quantity_received;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('purchase-orders.receive.store', order.id));
    };

    return (
        <AuthenticatedLayout header={`Receive Items — ${order.po_number}`}>
            <Head title={`Receive ${order.po_number}`} />

            <div className="space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('purchase-orders.show', order.id)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to PO
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Enter Quantities Received</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Supplier: <strong>{order.supplier_name}</strong>
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right">Already Received</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead className="w-36 text-right">Receive Now *</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => {
                                        const rem = remaining(item);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {item.quantity_received}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {rem > 0 ? (
                                                        <span className="text-yellow-600">{rem}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={rem}
                                                        className="w-24 text-right ml-auto"
                                                        value={data.items[index]?.quantity_received ?? '0'}
                                                        onChange={(e) => updateQty(index, e.target.value)}
                                                        disabled={rem === 0}
                                                    />
                                                    {errors[`items.${index}.quantity_received` as keyof typeof errors] && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {errors[`items.${index}.quantity_received` as keyof typeof errors] as string}
                                                        </p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="shipping_fee">Shipping Fee (optional)</Label>
                                    <Input
                                        id="shipping_fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={data.shipping_fee}
                                        onChange={(e) => setData('shipping_fee', e.target.value)}
                                    />
                                    {errors.shipping_fee && (
                                        <p className="text-xs text-destructive">{errors.shipping_fee}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (optional)</Label>
                                    <Textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="e.g. partial shipment, damaged items..."
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>
                                    <PackageCheck className="mr-2 h-4 w-4" /> Confirm Receipt & Update Stock
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={route('purchase-orders.show', order.id)}>Cancel</Link>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
