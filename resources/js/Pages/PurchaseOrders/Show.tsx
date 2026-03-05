import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, PackageCheck, ShoppingCart, XCircle } from 'lucide-react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { PurchaseOrder } from '@/types';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft:              { label: 'Draft',              variant: 'secondary' },
    ordered:            { label: 'Ordered',            variant: 'default' },
    partially_received: { label: 'Partially Received', variant: 'outline' },
    received:           { label: 'Received',           variant: 'default' },
    cancelled:          { label: 'Cancelled',          variant: 'destructive' },
};

interface Props {
    order: PurchaseOrder;
}

export default function PurchaseOrderShow({ order }: Props) {
    const confirm = useConfirm();
    const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: 'secondary' as const };

    const isCancellable = ['draft', 'ordered'].includes(order.status);

    const handleCancel = async () => {
        const ok = await confirm({
            title: 'Cancel Purchase Order',
            description: `Cancel PO ${order.po_number}?`,
            confirmLabel: 'Cancel PO',
            variant: 'destructive',
        });
        if (!ok) return;
        router.post(route('purchase-orders.cancel', order.id));
    };

    const handleMarkOrdered = async () => {
        const ok = await confirm({
            title: 'Mark as Ordered',
            description: 'Mark this PO as ordered / placed with supplier?',
            confirmLabel: 'Mark Ordered',
        });
        if (!ok) return;
        router.post(route('purchase-orders.mark-ordered', order.id));
    };

    return (
        <AuthenticatedLayout header={`PO: ${order.po_number}`}>
            <Head title={`PO ${order.po_number}`} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('purchase-orders.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        {/* Mark as Ordered — draft only */}
                        {order.status === 'draft' && (
                            <PermissionGate permission="purchasing.manage">
                                <Button variant="outline" onClick={handleMarkOrdered}>
                                    <ShoppingCart className="mr-2 h-4 w-4" /> Mark as Ordered
                                </Button>
                            </PermissionGate>
                        )}

                        {/* Receive Items */}
                        {(order.status === 'ordered' || order.status === 'partially_received') && (
                            <PermissionGate permission="purchasing.receive">
                                <Button asChild>
                                    <Link href={route('purchase-orders.receive', order.id)}>
                                        <PackageCheck className="mr-2 h-4 w-4" /> Receive Items
                                    </Link>
                                </Button>
                            </PermissionGate>
                        )}

                        {/* Cancel */}
                        {isCancellable && (
                            <Button variant="destructive" onClick={handleCancel}>
                                <XCircle className="mr-2 h-4 w-4" /> Cancel PO
                            </Button>
                        )}
                    </div>
                </div>

                {/* PO Header */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-mono text-xl">{order.po_number}</CardTitle>
                            <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                                {order.supplier ? (
                                    <>
                                        <p className="font-medium">{order.supplier.name}</p>
                                        {order.supplier.contact_person && (
                                            <p className="text-sm text-muted-foreground">{order.supplier.contact_person}</p>
                                        )}
                                        {order.supplier.phone && (
                                            <p className="text-sm text-muted-foreground">{order.supplier.phone}</p>
                                        )}
                                        {order.supplier.email && (
                                            <p className="text-sm text-muted-foreground">{order.supplier.email}</p>
                                        )}
                                    </>
                                ) : (
                                    <p className="font-medium">{order.supplier_name}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                                    <p className="text-sm">{formatDate(order.created_at)}</p>
                                </div>
                                {order.creator && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Created by</p>
                                        <p className="text-sm">{order.creator.name}</p>
                                    </div>
                                )}
                                {order.ordered_at && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ordered</p>
                                        <p className="text-sm">{formatDate(order.ordered_at)}</p>
                                    </div>
                                )}
                                {order.received_at && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Received</p>
                                        <p className="text-sm">{formatDate(order.received_at)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {order.notes && (
                            <>
                                <Separator className="my-4" />
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{order.notes}</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Order Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Ordered</TableHead>
                                    <TableHead className="text-right">Received</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(order.items ?? []).map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <p className="font-medium">{item.product_name}</p>
                                            {item.notes && (
                                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                                        <TableCell className="text-right text-green-600">{item.quantity_received}</TableCell>
                                        <TableCell className="text-right">
                                            {item.quantity_ordered - item.quantity_received > 0 ? (
                                                <span className="text-yellow-600">
                                                    {item.quantity_ordered - item.quantity_received}
                                                </span>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Separator className="my-4" />
                        <div className="flex justify-end">
                            <div className="text-right space-y-1">
                                <div className="flex justify-between gap-12 text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(order.subtotal)}</span>
                                </div>
                                {Number(order.shipping_fee) > 0 && (
                                    <div className="flex justify-between gap-12 text-sm">
                                        <span className="text-muted-foreground">Shipping Fee</span>
                                        <span>{formatCurrency(order.shipping_fee)}</span>
                                    </div>
                                )}
                                <Separator className="my-1" />
                                <div className="flex justify-between gap-12">
                                    <span className="text-sm text-muted-foreground">Total</span>
                                    <span className="text-2xl font-bold">{formatCurrency(order.total)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
