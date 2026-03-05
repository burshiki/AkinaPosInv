import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Separator } from '@/Components/ui/separator';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Plus, Search, Eye, PackageCheck, XCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { PurchaseOrder, PaginatedData, Product, Supplier } from '@/types';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft:              { label: 'Draft',              variant: 'secondary' },
    ordered:            { label: 'Ordered',            variant: 'default' },
    partially_received: { label: 'Partial',            variant: 'outline' },
    received:           { label: 'Received',           variant: 'default' },
    cancelled:          { label: 'Cancelled',          variant: 'destructive' },
};

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

interface Props {
    orders: PaginatedData<PurchaseOrder>;
    filters: { search?: string; status?: string };
    products: Product[];
    suppliers: Supplier[];
}

export default function PurchaseOrdersIndex({ orders, filters, products, suppliers }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [dialogOpen, setDialogOpen] = useState(false);

    const form = useForm({
        supplier_id: '',
        notes: '',
        items: [emptyLine()] as LineItem[],
    });

    useEffect(() => {
        router.get(
            route('purchase-orders.index'),
            { search: debouncedSearch || undefined, status: filters.status || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleStatusFilter = (value: string) => {
        router.get(
            route('purchase-orders.index'),
            { search: search || undefined, status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const handleCancel = async (order: PurchaseOrder) => {
        const ok = await confirm({
            title: 'Cancel Purchase Order',
            description: `Cancel PO ${order.po_number}?`,
            confirmLabel: 'Cancel PO',
            variant: 'destructive',
        });
        if (!ok) return;
        router.post(route('purchase-orders.cancel', order.id));
    };

    const handleDelete = async (order: PurchaseOrder) => {
        const ok = await confirm({
            title: 'Delete Purchase Order',
            description: `Delete draft PO ${order.po_number}?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('purchase-orders.destroy', order.id));
    };

    const updateItem = (index: number, field: keyof LineItem, value: string) => {
        const items = [...form.data.items];
        items[index] = { ...items[index], [field]: value };
        if (field === 'product_id' && value) {
            const product = products.find((p) => String(p.id) === value);
            if (product) {
                items[index].product_name = product.name;
                items[index].unit_cost = String(product.cost_price);
            }
        }
        form.setData('items', items);
    };

    const addLine = () => form.setData('items', [...form.data.items, emptyLine()]);
    const removeLine = (index: number) => {
        if (form.data.items.length === 1) return;
        form.setData('items', form.data.items.filter((_, i) => i !== index));
    };

    const subtotal = form.data.items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0),
        0
    );

    const openCreate = () => {
        form.setData({ supplier_id: '', notes: '', items: [emptyLine()] });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('purchase-orders.store'), { onSuccess: () => setDialogOpen(false) });
    };

    const errorsForItem = (index: number, field: string) => {
        const key = `items.${index}.${field}` as keyof typeof form.errors;
        return form.errors[key] as string | undefined;
    };

    return (
        <AuthenticatedLayout header="Purchase Orders">
            <Head title="Purchase Orders" />

            <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search PO number or supplier..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filters.status ?? 'all'} onValueChange={handleStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="ordered">Ordered</SelectItem>
                                <SelectItem value="partially_received">Partially Received</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <PermissionGate permission="purchasing.create">
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> New PO
                        </Button>
                    </PermissionGate>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Ordered At</TableHead>
                                <TableHead>Received At</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                        No purchase orders found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.data.map((order) => {
                                    const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: 'secondary' as const };
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono font-medium">
                                                <Link
                                                    href={route('purchase-orders.show', order.id)}
                                                    className="hover:underline"
                                                >
                                                    {order.po_number}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{order.supplier?.name ?? order.supplier_name}</TableCell>
                                            <TableCell>
                                                <Badge variant={status.variant}>{status.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(order.total)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {order.ordered_at ? formatDate(order.ordered_at) : '—'}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {order.received_at ? formatDate(order.received_at) : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View" asChild>
                                                        <Link href={route('purchase-orders.show', order.id)}><Eye className="h-4 w-4" /></Link>
                                                    </Button>
                                                    {(order.status === 'ordered' || order.status === 'partially_received') && (
                                                        <PermissionGate permission="purchasing.receive">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Receive Items" asChild>
                                                                <Link href={route('purchase-orders.receive', order.id)}><PackageCheck className="h-4 w-4" /></Link>
                                                            </Button>
                                                        </PermissionGate>
                                                    )}
                                                    {(order.status === 'draft' || order.status === 'ordered') && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Cancel" onClick={() => handleCancel(order)}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {order.status === 'draft' && (
                                                        <PermissionGate permission="purchasing.delete">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(order)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </PermissionGate>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination data={orders} />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>New Purchase Order</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[75vh] pr-4">
                        <form id="po-form" onSubmit={handleSubmit} className="space-y-6 pb-2">
                            {/* Supplier + Notes */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="po_supplier">Select Supplier *</Label>
                                    <Select value={form.data.supplier_id} onValueChange={(v) => form.setData('supplier_id', v)}>
                                        <SelectTrigger id="po_supplier">
                                            <SelectValue placeholder="Choose a supplier…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {s.name}{s.contact_person ? ` — ${s.contact_person}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.supplier_id && <p className="text-sm text-destructive">{form.errors.supplier_id}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="po_notes">Notes</Label>
                                    <Textarea id="po_notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} />
                                </div>
                            </div>

                            {/* Line Items */}
                            <div className="space-y-3">
                                <p className="text-sm font-semibold">Order Items</p>
                                {form.errors.items && <p className="text-sm text-destructive">{form.errors.items as string}</p>}
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product (optional)</TableHead>
                                                <TableHead>Item Name *</TableHead>
                                                <TableHead className="w-24 text-right">Qty</TableHead>
                                                <TableHead className="w-28 text-right">Unit Cost</TableHead>
                                                <TableHead className="w-28 text-right">Subtotal</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {form.data.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Select
                                                            value={item.product_id || 'none'}
                                                            onValueChange={(v) => updateItem(index, 'product_id', v === 'none' ? '' : v)}
                                                        >
                                                            <SelectTrigger className="w-44">
                                                                <SelectValue placeholder="Select product" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">— None —</SelectItem>
                                                                {products.map((p) => (
                                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
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
                                                            <p className="text-xs text-destructive mt-1">{errorsForItem(index, 'product_name')}</p>
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
                                                        {formatCurrency((parseFloat(item.quantity_ordered) || 0) * (parseFloat(item.unit_cost) || 0))}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeLine(index)}
                                                            disabled={form.data.items.length === 1}
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
                            </div>
                        </form>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="po-form" disabled={form.processing}>
                            {form.processing ? 'Creating...' : 'Create Purchase Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}