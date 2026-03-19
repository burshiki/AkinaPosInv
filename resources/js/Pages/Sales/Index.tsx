import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye, Ban, Search, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Sale, PaginatedData } from '@/types';

interface Props {
    sales: PaginatedData<Sale>;
    filters: { search?: string; date_from?: string; date_to?: string };
}

const STATUS_CFG: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success'> = {
    completed: 'success',
    voided:    'destructive',
};

export default function SalesIndex({ sales, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [voidTarget, setVoidTarget] = useState<Sale | null>(null);

    const voidForm = useForm({ password: '', reason: 'Voided by cashier' });

    const openVoid = (sale: Sale) => {
        voidForm.reset();
        voidForm.clearErrors();
        setVoidTarget(sale);
    };

    const handleVoidSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidTarget) return;
        voidForm.post(route('sales.void', voidTarget.id), {
            onSuccess: () => setVoidTarget(null),
        });
    };

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

    const handleVoid = async (sale: Sale) => {
        const ok = await confirm({
            title: 'Void Sale',
            description: `Are you sure you want to void sale ${sale.receipt_number}?`,
            confirmLabel: 'Void',
            variant: 'destructive',
        });
        if (!ok) return;
        router.post(route('sales.void', sale.id), { reason: 'Voided by cashier' });
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search receipt #..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                        <span className="text-muted-foreground">to</span>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                        <Button variant="outline" size="sm" onClick={handleDateFilter}>Filter</Button>
                    </div>
                </div>

                <div className="rounded-md border">
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
                                            <Badge variant={STATUS_CFG[sale.status] ?? 'secondary'}>{sale.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="View Receipt" asChild>
                                                    <Link href={route('sales.show', sale.id)}><Eye className="h-4 w-4" /></Link>
                                                </Button>
                                                {sale.status === 'completed' && (
                                                    <PermissionGate permission="sales.void">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Void Sale" onClick={() => openVoid(sale)}>
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

            <Dialog open={!!voidTarget} onOpenChange={(v) => { if (!v) setVoidTarget(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Ban className="h-5 w-5 text-destructive" /> Void Sale
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleVoidSubmit} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
                            <p className="text-muted-foreground">Receipt</p>
                            <p className="font-mono font-medium">{voidTarget?.receipt_number}</p>
                        </div>

                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            This action is irreversible. Voiding will restore stock and cancel the transaction.
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="void_password">Your Password</Label>
                            <Input
                                id="void_password"
                                type="password"
                                placeholder="Enter your password to confirm"
                                value={voidForm.data.password}
                                onChange={(e) => voidForm.setData('password', e.target.value)}
                                autoFocus
                            />
                            {voidForm.errors.password && (
                                <p className="text-sm text-destructive">{voidForm.errors.password}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={voidForm.processing || !voidForm.data.password}
                            >
                                {voidForm.processing ? 'Voiding…' : 'Void Sale'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
