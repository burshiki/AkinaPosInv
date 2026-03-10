import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { PaginatedData, StockAdjustment } from '@/types';

const TYPE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    manual:               { label: 'Manual',               variant: 'outline' },
    inventory_count:      { label: 'Inventory Count',      variant: 'default' },
    warranty_replacement:          { label: 'Warranty Replacement',          variant: 'secondary' },
    warranty_replacement_received: { label: 'Warranty Replacement Received', variant: 'secondary' },
    warranty_repair_received:      { label: 'Warranty Repair Received',      variant: 'secondary' },
    sale:            { label: 'Sale',            variant: 'destructive' },
    purchase:        { label: 'Purchase',        variant: 'secondary' },
    return:          { label: 'Return',          variant: 'secondary' },
    void:            { label: 'Void',            variant: 'destructive' },
    product_edit:    { label: 'Product Edit',    variant: 'outline' },
};

interface Props {
    adjustments: PaginatedData<StockAdjustment>;
    filters: { search?: string; type?: string; reason?: string; date_from?: string; date_to?: string };
}

export default function StockTransactions({ adjustments, filters }: Props) {
    const [search,   setSearch]   = useState(filters.search ?? '');
    const [type,     setType]     = useState(filters.type ?? 'all');
    const [reason,   setReason]   = useState(filters.reason ?? '');
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo,   setDateTo]   = useState(filters.date_to ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const debouncedReason = useDebounce(reason, 300);

    useEffect(() => {
        router.get(
            route('stock.transactions'),
            {
                search:    debouncedSearch || undefined,
                type:      type !== 'all' ? type : undefined,
                reason:    debouncedReason || undefined,
                date_from: dateFrom || undefined,
                date_to:   dateTo   || undefined,
            },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, type, debouncedReason, dateFrom, dateTo]);

    function buildPrintUrl() {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (type !== 'all')  params.set('type', type);
        if (debouncedReason) params.set('reason', debouncedReason);
        if (dateFrom)        params.set('date_from', dateFrom);
        if (dateTo)          params.set('date_to', dateTo);
        return route('stock.transactions.print') + (params.toString() ? '?' + params.toString() : '');
    }

    function changeIcon(change: number) {
        if (change > 0) return <TrendingUp className="inline h-3.5 w-3.5 text-green-600 mr-0.5" />;
        if (change < 0) return <TrendingDown className="inline h-3.5 w-3.5 text-destructive mr-0.5" />;
        return <Minus className="inline h-3.5 w-3.5 text-muted-foreground mr-0.5" />;
    }

    return (
        <AuthenticatedLayout>
            <Head title="Stock Transactions" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('stock.index')}>
                                <ArrowLeft className="h-4 w-4 mr-1.5" />
                                Stock List
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold">Stock Transactions</h1>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open(buildPrintUrl(), '_blank')}>
                        <Printer className="h-4 w-4 mr-1.5" />
                        Print Report
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search product or SKU…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by reason…"
                            className="pl-9"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="sale">Sale</SelectItem>
                            <SelectItem value="purchase">Purchase</SelectItem>
                            <SelectItem value="return">Return</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="inventory_count">Inventory Count</SelectItem>
                            <SelectItem value="warranty_replacement">Warranty Replacement</SelectItem>
                            <SelectItem value="warranty_replacement_received">Warranty Replacement Received</SelectItem>
                            <SelectItem value="warranty_repair_received">Warranty Repair Received</SelectItem>
                            <SelectItem value="product_edit">Product Edit</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        className="w-40"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="Date from"
                    />
                    <Input
                        type="date"
                        className="w-40"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="Date to"
                    />
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Before</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                                <TableHead className="text-right">After</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {adjustments.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                adjustments.data.map((a) => {
                                    const typeCfg = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.manual;
                                    return (
                                        <TableRow key={a.id}>
                                            <TableCell className="text-sm whitespace-nowrap">
                                                {formatDate(a.created_at)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {a.product?.name ?? `#${a.product_id}`}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {a.product?.sku ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{a.before_qty}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {changeIcon(a.change_qty)}
                                                <span className={
                                                    a.change_qty > 0
                                                        ? 'text-green-600'
                                                        : a.change_qty < 0
                                                            ? 'text-destructive'
                                                            : 'text-muted-foreground'
                                                }>
                                                    {a.change_qty > 0 ? `+${a.change_qty}` : a.change_qty}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{a.after_qty}</TableCell>
                                            <TableCell className="text-sm max-w-xs truncate">
                                                {a.reason ?? <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-sm">{a.user?.name ?? '—'}</TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination data={adjustments} />
            </div>
        </AuthenticatedLayout>
    );
}
