import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye, Ban, Search, ShoppingCart, Truck, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Sale, PaginatedData, SaleShipping } from '@/types';

interface Props {
    sales: PaginatedData<Sale>;
    filters: { search?: string; date_from?: string; date_to?: string };
    pendingShippings: SaleShipping[];
}

const STATUS_CFG: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
    completed: 'success',
    voided:    'destructive',
};

export default function SalesIndex({ sales, filters, pendingShippings }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [voidSale, setVoidSale] = useState<Sale | null>(null);
    const { data, setData, post, processing, errors, reset } = useForm({ password: '', reason: '' });

    useEffect(() => {
        router.get(
            route('sales.index'),
            {
                search: debouncedSearch || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleDateFilter = () => {
        router.get(
            route('sales.index'),
            {
                search: search || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleVoid = (sale: Sale) => {
        setVoidSale(sale);
        reset();
    };

    const submitVoid = () => {
        if (!voidSale) return;
        post(route('sales.void', voidSale.id), {
            onSuccess: () => { setVoidSale(null); reset(); },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Sales" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6" />
                        Sales History
                    </h1>
                </div>
                {/* Pending Shipping Alert */}
                {pendingShippings.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            {pendingShippings.length} sale{pendingShippings.length > 1 ? 's have' : ' has'} unconfirmed shipping fee{pendingShippings.length > 1 ? 's' : ''}
                        </div>
                        <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-300">
                            {pendingShippings.map((s) => (
                                <li key={s.id} className="flex items-center gap-2">
                                    <Truck className="h-3.5 w-3.5 shrink-0" />
                                    <Link
                                        href={route('sales.show', s.sale_id)}
                                        className="font-mono font-semibold hover:underline"
                                    >
                                        {s.sale?.receipt_number ?? `Sale #${s.sale_id}`}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search receipt #..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="flex-1 min-w-[130px]" />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="flex-1 min-w-[130px]" />
                        <Button variant="outline" size="sm" onClick={handleDateFilter} className="shrink-0">Filter</Button>
                    </div>
                </div>

                {/* Mobile card list */}
                <div className="flex flex-col gap-3 md:hidden">
                    {sales.data.length === 0 ? (
                        <div className="rounded-md border p-8 text-center text-muted-foreground">No sales found</div>
                    ) : (
                        sales.data.map((sale) => (
                            <div key={sale.id} className="rounded-lg border bg-card p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-mono font-semibold text-sm">{sale.receipt_number}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(sale.sold_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <Badge variant={STATUS_CFG[sale.status] ?? 'secondary'}>{sale.status}</Badge>
                                        {sale.shipping && sale.shipping.fee_status !== 'paid' && (
                                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400 gap-1">
                                                <Truck className="h-3 w-3" />
                                                {sale.shipping.fee_status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Cashier</p>
                                        <p>{sale.user?.name ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Customer</p>
                                        <p>{sale.customer_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Payment</p>
                                        <Badge variant="outline" className="mt-0.5">{sale.payment_method}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="font-semibold">{formatCurrency(sale.total)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button variant="outline" size="sm" className="flex-1" asChild>
                                        <Link href={route('sales.show', sale.id)}>
                                            <Eye className="h-4 w-4 mr-1.5" /> View
                                        </Link>
                                    </Button>
                                    {sale.status === 'completed' && (
                                        <PermissionGate permission="sales.void">
                                            <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleVoid(sale)}>
                                                <Ban className="h-4 w-4 mr-1.5" /> Void
                                            </Button>
                                        </PermissionGate>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sales.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No sales found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales.data.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-mono font-medium">{sale.receipt_number}</TableCell>
                                        <TableCell>{formatDate(sale.sold_at)}</TableCell>
                                        <TableCell>{sale.user?.name ?? '—'}</TableCell>
                                        <TableCell>{sale.customer_name || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{sale.payment_method}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(sale.total)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant={STATUS_CFG[sale.status] ?? 'secondary'}>{sale.status}</Badge>
                                                {sale.shipping && sale.shipping.fee_status !== 'paid' && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-400 text-amber-700 dark:text-amber-400 gap-1"
                                                        title={`Shipping fee ${sale.shipping.fee_status}`}
                                                    >
                                                        <Truck className="h-3 w-3" />
                                                        {sale.shipping.fee_status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="View Receipt" asChild>
                                                    <Link href={route('sales.show', sale.id)}><Eye className="h-4 w-4" /></Link>
                                                </Button>
                                                {sale.status === 'completed' && (
                                                    <PermissionGate permission="sales.void">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Void Sale" onClick={() => handleVoid(sale)}>
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    </PermissionGate>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>                    </ScrollArea>                </div>

                <Pagination data={sales} />
            </div>

            {/* Void Dialog */}
            <Dialog open={!!voidSale} onOpenChange={(open) => { if (!open) { setVoidSale(null); reset(); } }}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Void Sale</DialogTitle>
                        <DialogDescription>
                            Void <span className="font-mono font-semibold">{voidSale?.receipt_number}</span>? Enter your password to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="void-password">Your Password <span className="text-destructive">*</span></Label>
                            <Input
                                id="void-password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitVoid()}
                                autoFocus
                            />
                            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="void-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input
                                id="void-reason"
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                placeholder="e.g. Customer request"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => { setVoidSale(null); reset(); }}>Cancel</Button>
                        <Button variant="destructive" onClick={submitVoid} disabled={processing || !data.password}>
                            {processing ? 'Voiding…' : 'Void Sale'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
