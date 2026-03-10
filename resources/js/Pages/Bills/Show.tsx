import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDateOnly, formatDate } from '@/lib/utils';
import { useConfirm } from '@/Components/app/confirm-dialog';
import { ArrowLeft, CreditCard, Ban } from 'lucide-react';
import type { Bill } from '@/types';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unpaid:         { label: 'Unpaid',      variant: 'secondary' },
    partially_paid: { label: 'Partial',     variant: 'outline' },
    paid:           { label: 'Paid',        variant: 'default' },
    overdue:        { label: 'Overdue',     variant: 'destructive' },
    voided:         { label: 'Voided',      variant: 'destructive' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash:          'Cash',
    check:         'Check',
    bank_transfer: 'Bank Transfer',
    online:        'Online',
};

interface Props {
    bill: Bill;
}

export default function BillShow({ bill }: Props) {
    const confirm = useConfirm();
    const statusInfo = STATUS_LABELS[bill.status] ?? { label: bill.status, variant: 'secondary' as const };

    const handleVoid = async () => {
        const ok = await confirm({
            title: 'Void Bill',
            description: `Are you sure you want to void bill ${bill.bill_number}?`,
            confirmLabel: 'Void Bill',
            variant: 'destructive',
        });
        if (!ok) return;
        router.post(route('bills.void', bill.id));
    };

    return (
        <AuthenticatedLayout header={`Bill ${bill.bill_number}`}>
            <Head title={`Bill ${bill.bill_number}`} />

            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={route('bills.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bills
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        {['unpaid', 'partially_paid'].includes(bill.status) && (
                            <PermissionGate permission="ap.pay">
                                <Button asChild>
                                    <Link href={route('bills.pay', bill.id)}>
                                        <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                                    </Link>
                                </Button>
                            </PermissionGate>
                        )}
                        {bill.status !== 'voided' && bill.paid_amount === 0 && (
                            <PermissionGate permission="ap.void">
                                <Button variant="destructive" onClick={handleVoid}>
                                    <Ban className="mr-2 h-4 w-4" /> Void
                                </Button>
                            </PermissionGate>
                        )}
                    </div>
                </div>

                {/* Bill Details */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Bill Details</CardTitle>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Supplier</p>
                                <p className="font-medium">{bill.supplier_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Category</p>
                                <p className="font-medium capitalize">{bill.category.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Bill Date</p>
                                <p className="font-medium">{formatDateOnly(bill.bill_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Due Date</p>
                                <p className="font-medium">{formatDateOnly(bill.due_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Created By</p>
                                <p className="font-medium">{bill.creator?.name ?? '—'}</p>
                            </div>
                            {bill.purchase_order_id && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Purchase Order</p>
                                    <Link
                                        href={route('purchase-orders.show', bill.purchase_order_id)}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {bill.purchase_order?.po_number ?? `PO #${bill.purchase_order_id}`}
                                    </Link>
                                </div>
                            )}
                        </div>
                        {bill.notes && (
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="whitespace-pre-wrap text-sm">{bill.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader>
                        <CardTitle>Line Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bill.items?.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Separator className="my-2" />
                        <div className="flex justify-end">
                            <div className="w-64 space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(bill.subtotal)}</span>
                                </div>
                                {bill.tax_amount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span>Tax</span>
                                        <span>{formatCurrency(bill.tax_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{formatCurrency(bill.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Paid</span>
                                    <span>{formatCurrency(bill.paid_amount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-red-600">
                                    <span>Balance</span>
                                    <span>{formatCurrency(bill.balance)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment History */}
                {bill.payments && bill.payments.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Paid By</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bill.payments.map((payment) => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{formatDate(payment.paid_at)}</TableCell>
                                            <TableCell>{PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}</TableCell>
                                            <TableCell>
                                                {payment.check_number && (
                                                    <span>
                                                        Check: {payment.check_number}
                                                        {payment.check_date && (
                                                            <span className="ml-1 text-xs text-muted-foreground">
                                                                (dated {formatDateOnly(payment.check_date)})
                                                            </span>
                                                        )}
                                                    </span>
                                                )}
                                                {!payment.check_number && payment.check_date && (
                                                    <span className="text-xs text-muted-foreground">Check dated {formatDateOnly(payment.check_date)}</span>
                                                )}
                                                {payment.reference_number && `Ref: ${payment.reference_number}`}
                                                {payment.bank_account && (payment.bank_account.bank_name || payment.bank_account.name)}
                                                {!payment.check_number && !payment.check_date && !payment.reference_number && !payment.bank_account && '—'}
                                            </TableCell>
                                            <TableCell>{payment.payer?.name ?? '—'}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
