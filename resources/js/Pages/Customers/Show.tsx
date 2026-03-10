import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, CreditCard, ShoppingBag, DollarSign, CalendarDays, Star } from 'lucide-react';
import type { Customer, Sale, PaginatedData } from '@/types';

interface Props {
    customer: Customer;
    purchaseHistory: PaginatedData<Sale>;
    stats: {
        total_purchases: number;
        total_spent: number;
        last_purchase: string | null;
    };
}

export default function CustomerShow({ customer, purchaseHistory, stats }: Props) {
    return (
        <AuthenticatedLayout header="Customer Details">
            <Head title={`Customer — ${customer.name}`} />

            <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('customers.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <PermissionGate permission="debts.view">
                            <Button variant="outline" asChild>
                                <Link href={route('debts.show', customer.name)}>
                                    <CreditCard className="mr-2 h-4 w-4" /> View Debts
                                </Link>
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission="customers.edit">
                            <Button asChild>
                                <Link href={route('customers.edit', customer.id)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Customer Info */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">{customer.name}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                                    {customer.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                {customer.loyalty_tier !== 'standard' && (
                                    <Badge variant="outline" className="capitalize">
                                        <Star className="mr-1 h-3 w-3" /> {customer.loyalty_tier}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-4 text-sm">
                            {customer.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{customer.phone}</span>
                                </div>
                            )}
                            {customer.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{customer.email}</span>
                                </div>
                            )}
                        </div>
                        {customer.address && (
                            <>
                                <Separator />
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-line">{customer.address}</span>
                                </div>
                            </>
                        )}
                        {customer.notes && (
                            <>
                                <Separator />
                                <div className="flex items-start gap-2 text-sm">
                                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-line text-muted-foreground">{customer.notes}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total_purchases}</p>
                                <p className="text-xs text-muted-foreground">Total Purchases</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-green-500/10 p-2">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(stats.total_spent)}</p>
                                <p className="text-xs text-muted-foreground">Total Spent</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                                <CalendarDays className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    {stats.last_purchase ? new Date(stats.last_purchase).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">Last Purchase</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <div className="rounded-lg bg-yellow-500/10 p-2">
                                <Star className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{(customer.loyalty_points ?? 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Loyalty Points</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Purchase History */}
                <Card>
                    <CardHeader>
                        <CardTitle>Purchase History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Receipt #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {purchaseHistory.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No purchases yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseHistory.data.map((sale) => (
                                        <TableRow key={sale.id}>
                                            <TableCell className="font-mono text-sm">{sale.receipt_number}</TableCell>
                                            <TableCell className="text-sm">{formatDate(sale.sold_at)}</TableCell>
                                            <TableCell className="text-sm">
                                                {sale.items?.length ?? 0} item{(sale.items?.length ?? 0) !== 1 ? 's' : ''}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize text-xs">
                                                    {sale.payment_method}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(sale.total)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={sale.status === 'completed' ? 'default' : sale.status === 'voided' ? 'destructive' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {sale.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('sales.show', sale.id)}>View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {purchaseHistory.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-sm text-muted-foreground">
                                    Showing {purchaseHistory.from}–{purchaseHistory.to} of {purchaseHistory.total}
                                </p>
                                <div className="flex gap-1">
                                    {purchaseHistory.links.map((link, i) => (
                                        <Button
                                            key={i}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            asChild={!!link.url}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveState dangerouslySetInnerHTML={{ __html: link.label }} />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
