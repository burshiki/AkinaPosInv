import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, PackageCheck, ShoppingCart, XCircle, FileText, CreditCard } from 'lucide-react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { PurchaseOrder, BankAccount, CashDrawerSession } from '@/types';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft:              { label: 'Draft',              variant: 'secondary' },
    approved:           { label: 'Approved',           variant: 'default' },
    partially_received: { label: 'Partially Received', variant: 'outline' },
    received:           { label: 'Received',           variant: 'default' },
    cancelled:          { label: 'Cancelled',          variant: 'destructive' },
};

const PAYMENT_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unpaid:         { label: 'Unpaid',         variant: 'destructive' },
    partially_paid: { label: 'Partially Paid', variant: 'outline' },
    paid:           { label: 'Paid',           variant: 'default' },
};

interface Props {
    order: PurchaseOrder;
    bankAccounts: BankAccount[];
    openSession: CashDrawerSession | null;
}

export default function PurchaseOrderShow({ order, bankAccounts, openSession }: Props) {
    const confirm = useConfirm();
    const [payOpen, setPayOpen] = useState(false);

    const payForm = useForm({
        payment_method: '',
        amount: String(order.bill?.balance ?? ''),
        bank_account_id: '',
        check_number: '',
        check_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
    });

    const openPayModal = () => {
        payForm.reset();
        payForm.setData('amount', String(order.bill?.balance ?? ''));
        setPayOpen(true);
    };

    const handlePaySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!order.bill) return;
        payForm.post(route('bills.pay.store', order.bill.id), {
            onSuccess: () => setPayOpen(false),
        });
    };

    const payMethod = payForm.data.payment_method;
    const showBankField = ['check', 'bank_transfer'].includes(payMethod);
    const showCheckFields = payMethod === 'check';
    const status = STATUS_LABELS[order.status] ?? { label: order.status, variant: 'secondary' as const };

    const isCancellable = ['draft', 'approved'].includes(order.status);

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

    const handleApprove = async () => {
        const ok = await confirm({
            title: 'Approve Purchase Order',
            description: 'Approve this PO and mark it ready for receiving?',
            confirmLabel: 'Approve',
        });
        if (!ok) return;
        router.post(route('purchase-orders.approve', order.id));
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
                        {/* Approve — draft only */}
                        {order.status === 'draft' && (
                            <PermissionGate permission="purchasing.approve">
                                <Button variant="outline" onClick={handleApprove}>
                                    <ShoppingCart className="mr-2 h-4 w-4" /> Approve PO
                                </Button>
                            </PermissionGate>
                        )}

                        {/* Receive Items */}
                        {(order.status === 'approved' || order.status === 'partially_received') && (
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
                                {order.approved_at && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Approved</p>
                                        <p className="text-sm">{formatDate(order.approved_at)}</p>
                                    </div>
                                )}
                                {order.approver && (
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Approved by</p>
                                        <p className="text-sm">{order.approver.name}</p>
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

                {/* Linked Bill */}
                {order.bill && (() => {
                    const ps = PAYMENT_STATUS[order.payment_status] ?? { label: order.payment_status, variant: 'secondary' as const };
                    return (
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="h-4 w-4" /> Linked Bill
                                    </CardTitle>
                                    <Badge variant={ps.variant}>{ps.label}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Link href={route('bills.show', order.bill.id)} className="font-mono text-primary hover:underline">
                                            {order.bill.bill_number}
                                        </Link>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Total: {formatCurrency(order.bill.total_amount)} &middot; Balance: {formatCurrency(order.bill.balance)}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {!['paid', 'voided'].includes(order.payment_status) && (
                                            <PermissionGate permission="ap.pay">
                                                <Button size="sm" onClick={openPayModal}>
                                                    <CreditCard className="h-4 w-4 mr-1.5" /> Record Payment
                                                </Button>
                                            </PermissionGate>
                                        )}
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={route('bills.show', order.bill.id)}>View Bill</Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}
            </div>

            {/* Record Payment Modal */}
            {order.bill && (
                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" /> Record Payment
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handlePaySubmit} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bill</span>
                                    <span className="font-mono">{order.bill.bill_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Balance Due</span>
                                    <span className="font-semibold text-destructive">{formatCurrency(order.bill.balance)}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Payment Method *</Label>
                                <Select value={payForm.data.payment_method} onValueChange={(v) => payForm.setData('payment_method', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash" disabled={!openSession}>
                                            Cash{!openSession ? ' (No open drawer)' : ''}
                                        </SelectItem>
                                        <SelectItem value="check">Check</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                                {payForm.errors.payment_method && <p className="text-sm text-destructive">{payForm.errors.payment_method}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Amount *</Label>
                                <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={payForm.data.amount}
                                    onChange={(e) => payForm.setData('amount', e.target.value)}
                                />
                                {payForm.errors.amount && <p className="text-sm text-destructive">{payForm.errors.amount}</p>}
                            </div>

                            {showBankField && (
                                <div className="space-y-1.5">
                                    <Label>Bank Account *</Label>
                                    <Select value={payForm.data.bank_account_id} onValueChange={(v) => payForm.setData('bank_account_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select bank account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((ba) => (
                                                <SelectItem key={ba.id} value={String(ba.id)}>
                                                    {ba.bank_name ?? ba.name} ({formatCurrency(ba.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {payForm.errors.bank_account_id && <p className="text-sm text-destructive">{payForm.errors.bank_account_id}</p>}
                                </div>
                            )}

                            {showCheckFields && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label>Check Number</Label>
                                        <Input
                                            value={payForm.data.check_number}
                                            onChange={(e) => payForm.setData('check_number', e.target.value)}
                                            placeholder="Check #"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Check Date *</Label>
                                        <Input
                                            type="date"
                                            value={payForm.data.check_date}
                                            onChange={(e) => payForm.setData('check_date', e.target.value)}
                                        />
                                        {payForm.data.check_date > new Date().toISOString().split('T')[0] && (
                                            <p className="text-xs text-amber-600">Post-dated check — dated {payForm.data.check_date}</p>
                                        )}
                                        {payForm.errors.check_date && <p className="text-sm text-destructive">{payForm.errors.check_date}</p>}
                                    </div>
                                </>
                            )}

                            {payMethod === 'bank_transfer' && (
                                <div className="space-y-1.5">
                                    <Label>Reference Number</Label>
                                    <Input
                                        value={payForm.data.reference_number}
                                        onChange={(e) => payForm.setData('reference_number', e.target.value)}
                                        placeholder="Reference #"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label>Notes</Label>
                                <Textarea
                                    value={payForm.data.notes}
                                    onChange={(e) => payForm.setData('notes', e.target.value)}
                                    placeholder="Optional notes..."
                                    rows={2}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={payForm.processing}>
                                    {payForm.processing ? 'Processing...' : `Pay ${formatCurrency(parseFloat(payForm.data.amount) || 0)}`}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </AuthenticatedLayout>
    );
}
