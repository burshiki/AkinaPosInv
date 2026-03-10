import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { PermissionGate } from '@/Components/app/permission-gate';
import { ArrowLeft, Pencil, ShieldCheck, Receipt } from 'lucide-react';
import { formatCurrency, formatDate, formatDateOnly } from '@/lib/utils';
import type { Supplier, Warranty, Bill } from '@/types';

const WARRANTY_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    checking:         { label: 'Checking',         variant: 'outline' },
    confirmed:        { label: 'Issue Confirmed',  variant: 'destructive' },
    sent_to_supplier: { label: 'Sent to Supplier', variant: 'secondary' },
    active:           { label: 'Active',           variant: 'default' },
    expired:          { label: 'Expired',          variant: 'secondary' },
    pending:          { label: 'Pending Serial',   variant: 'outline' },
};

const BILL_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unpaid:  { label: 'Unpaid',  variant: 'destructive' },
    partial: { label: 'Partial', variant: 'outline' },
    overdue: { label: 'Overdue', variant: 'destructive' },
};

interface Props {
    supplier: Supplier & { purchase_orders_count: number };
    warranties: Warranty[];
    outstandingBills: Bill[];
    totalOwed: number;
}

export default function SupplierShow({ supplier, warranties, outstandingBills, totalOwed }: Props) {
    return (
        <AuthenticatedLayout header={supplier.name}>
            <Head title={supplier.name} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('suppliers.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <PermissionGate permission="suppliers.edit">
                        <Button asChild>
                            <Link href={route('suppliers.edit', supplier.id)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{supplier.name}</CardTitle>
                            <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                                {supplier.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {supplier.contact_person && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                                <p>{supplier.contact_person}</p>
                            </div>
                        )}
                        {supplier.phone && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                <p>{supplier.phone}</p>
                            </div>
                        )}
                        {supplier.email && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p>{supplier.email}</p>
                            </div>
                        )}
                        {supplier.address && (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Address</p>
                                <p className="whitespace-pre-line">{supplier.address}</p>
                            </div>
                        )}
                        {supplier.notes && (
                            <>
                                <Separator />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                                    <p className="whitespace-pre-line text-sm">{supplier.notes}</p>
                                </div>
                            </>
                        )}
                        <Separator />
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Purchase Orders</p>
                            <p className="text-2xl font-bold">{supplier.purchase_orders_count}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Outstanding Bills */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Receipt className="h-4 w-4" />
                                Outstanding Bills
                                <Badge variant="secondary" className="ml-1">{outstandingBills.length}</Badge>
                            </CardTitle>
                            {totalOwed > 0 && (
                                <span className="text-lg font-bold text-red-600">{formatCurrency(totalOwed)}</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {outstandingBills.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-6 py-4">
                                No outstanding bills for this supplier.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill #</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {outstandingBills.map((bill) => {
                                        const cfg = BILL_STATUS[bill.status] ?? { label: bill.status, variant: 'secondary' as const };
                                        return (
                                            <TableRow key={bill.id}>
                                                <TableCell>
                                                    <Link href={route('bills.show', bill.id)} className="font-mono text-sm text-primary hover:underline">
                                                        {bill.bill_number}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="capitalize text-sm">{bill.category.replace(/_/g, ' ')}</TableCell>
                                                <TableCell className="text-sm">{formatDateOnly(bill.due_date)}</TableCell>
                                                <TableCell className="text-right text-sm">{formatCurrency(bill.total_amount)}</TableCell>
                                                <TableCell className="text-right font-medium text-red-600">{formatCurrency(bill.balance)}</TableCell>
                                                <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Warranty Claims */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldCheck className="h-4 w-4" />
                            Warranty Claims
                            <Badge variant="secondary" className="ml-1">{warranties.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {warranties.length === 0 ? (
                            <p className="text-sm text-muted-foreground px-6 py-4">
                                No warranty claims sent to this supplier.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Receipt #</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Issue / Reason</TableHead>
                                        <TableHead>Tracking #</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warranties.map((w) => {
                                        const cfg = WARRANTY_STATUS[w.status] ?? WARRANTY_STATUS.checking;
                                        return (
                                            <TableRow key={w.id}>
                                                <TableCell className="font-mono text-sm">{w.receipt_number}</TableCell>
                                                <TableCell>{w.product?.name ?? `#${w.product_id}`}</TableCell>
                                                <TableCell>{w.customer_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                                <TableCell className="max-w-xs">
                                                    {w.check_reason
                                                        ? <span className="text-sm">{w.check_reason}</span>
                                                        : <span className="text-muted-foreground text-sm">—</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {w.tracking_number
                                                        ? <span className="font-mono text-sm">{w.tracking_number}</span>
                                                        : <span className="text-muted-foreground text-sm">—</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{formatDate(w.updated_at)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
