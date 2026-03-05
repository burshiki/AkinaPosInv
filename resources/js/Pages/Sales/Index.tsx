import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';

import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Eye, Ban, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { Sale, PaginatedData } from '@/types';

interface Props {
    sales: PaginatedData<Sale>;
    filters: { search?: string; date_from?: string; date_to?: string };
}

export default function SalesIndex({ sales, filters }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const debouncedSearch = useDebounce(search, 300);

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

    const statusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success' as const;
            case 'voided': return 'destructive' as const;
            default: return 'secondary' as const;
        }
    };

    return (
        <AuthenticatedLayout header="Sales History">
            <Head title="Sales" />

            <div className="space-y-4">
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
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                                            <Badge variant={statusVariant(sale.status)}>{sale.status}</Badge>
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
                    </Table>
                </div>

                <Pagination data={sales} />
            </div>
        </AuthenticatedLayout>
    );
}
