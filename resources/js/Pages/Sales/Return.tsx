import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Checkbox } from '@/Components/ui/checkbox';
import { Textarea } from '@/Components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { Sale, BankAccount } from '@/types';

interface Props {
    sale: Sale;
    returnedQuantities: Record<number, number>;
    bankAccounts: BankAccount[];
}

export default function SaleReturn({ sale, returnedQuantities, bankAccounts }: Props) {
    const { data, setData, post, processing, errors, transform } = useForm<{
        type: 'refund' | 'exchange';
        refund_method: string;
        bank_account_id: string;
        reason: string;
        notes: string;
        items: Array<{
            sale_item_id: number;
            quantity_returned: number;
            restock: boolean;
        }>;
    }>({
        type: 'refund',
        refund_method: 'cash',
        bank_account_id: '',
        reason: '',
        notes: '',
        items: (sale.items || []).map(item => ({
            sale_item_id: item.id,
            quantity_returned: 0,
            restock: true,
        })),
    });

    const maxReturnable = (itemId: number, originalQty: number) => {
        return originalQty - (returnedQuantities[itemId] || 0);
    };

    const totalRefund = data.items.reduce((sum, returnItem, idx) => {
        const saleItem = sale.items?.[idx];
        if (!saleItem || returnItem.quantity_returned <= 0) return sum;
        return sum + returnItem.quantity_returned * saleItem.unit_price;
    }, 0);

    function updateItem(index: number, field: string, value: number | boolean) {
        const items = [...data.items];
        items[index] = { ...items[index], [field]: value };
        setData('items', items);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const filteredItems = data.items.filter(item => item.quantity_returned > 0);
        if (filteredItems.length === 0) return;

        transform(d => ({ ...d, items: d.items.filter(i => i.quantity_returned > 0) }));
        post(route('sales.return.store', sale.id));
    }

    return (
        <AuthenticatedLayout header={`Return — Sale ${sale.receipt_number}`}>
            <Head title={`Return ${sale.receipt_number}`} />

            <div className="mx-auto max-w-3xl space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('sales.show', sale.id)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sale
                    </Link>
                </Button>

                <form onSubmit={submit} className="space-y-4">
                    {/* Sale Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Select Items to Return</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Sold</TableHead>
                                        <TableHead className="text-right">Returnable</TableHead>
                                        <TableHead className="text-right">Return Qty</TableHead>
                                        <TableHead className="text-center">Restock</TableHead>
                                        <TableHead className="text-right">Refund</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(sale.items || []).map((item, idx) => {
                                        const maxQty = maxReturnable(item.id, item.quantity);
                                        const returnQty = data.items[idx]?.quantity_returned || 0;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">{item.product_name}</div>
                                                    <div className="text-sm text-muted-foreground">{item.product_sku}</div>
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{maxQty}</TableCell>
                                                <TableCell className="text-right w-24">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={maxQty}
                                                        value={returnQty}
                                                        onChange={e => updateItem(idx, 'quantity_returned', Math.min(Number(e.target.value), maxQty))}
                                                        className="w-20 text-right"
                                                        disabled={maxQty <= 0}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={data.items[idx]?.restock ?? true}
                                                        onCheckedChange={(checked) => updateItem(idx, 'restock', !!checked)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {returnQty > 0 ? formatCurrency(returnQty * item.unit_price) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Return Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Return Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Return Type</Label>
                                    <Select
                                        value={data.type}
                                        onValueChange={v => setData('type', v as 'refund' | 'exchange')}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="refund">Refund</SelectItem>
                                            <SelectItem value="exchange">Exchange</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {data.type === 'refund' && (
                                    <div className="space-y-2">
                                        <Label>Refund Method</Label>
                                        <Select
                                            value={data.refund_method}
                                            onValueChange={v => setData('refund_method', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="online">Online / Bank</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {data.type === 'refund' && data.refund_method === 'online' && (
                                    <div className="space-y-2">
                                        <Label>Bank Account</Label>
                                        <Select
                                            value={data.bank_account_id}
                                            onValueChange={v => setData('bank_account_id', v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bankAccounts.map(ba => (
                                                    <SelectItem key={ba.id} value={String(ba.id)}>
                                                        {ba.bank_name || ba.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.bank_account_id && <p className="text-sm text-red-500">{errors.bank_account_id}</p>}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Input
                                    value={data.reason}
                                    onChange={e => setData('reason', e.target.value)}
                                    placeholder="Reason for return"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Additional notes"
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary & Submit */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Refund Amount</p>
                                    <p className="text-2xl font-bold">{formatCurrency(totalRefund)}</p>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={processing || totalRefund <= 0}
                                    className="min-w-32"
                                >
                                    {processing ? 'Processing...' : 'Process Return'}
                                </Button>
                            </div>
                            {errors.items && <p className="mt-2 text-sm text-red-500">{errors.items}</p>}
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
