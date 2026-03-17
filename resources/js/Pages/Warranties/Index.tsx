import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, ShieldCheck, Eye, AlertCircle, Truck, PackageCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Warranty, PaginatedData } from '@/types';

const WARRANTY_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    pending_serial: { label: 'Pending Serial', variant: 'outline' },
    active:         { label: 'Active',          variant: 'default' },
};

interface Props {
    warranties:          PaginatedData<Warranty & { open_claims_count: number }>;
    pendingCount:        number;
    inRepairCount:       number;
    defectiveSentCount:  number;
    filters:             { search?: string; status?: string };
}

export default function WarrantiesIndex({ warranties, pendingCount, inRepairCount, defectiveSentCount, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('warranties.index'),
            { search: debouncedSearch || undefined, status: status !== 'all' ? status : undefined },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, status]);

    return (
        <AuthenticatedLayout>
            <Head title="Warranties" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6" />
                            Warranties
                        </h1>
                        {pendingCount > 0 && (
                            <PermissionGate permission="warranties.record_serial">
                                <div className="flex items-center gap-3 mt-0.5">
                                    <Link
                                        href={route('warranties.batch-record')}
                                        className="text-sm text-amber-600 hover:underline flex items-center gap-1"
                                    >
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        {pendingCount} warrant{pendingCount === 1 ? 'y' : 'ies'} awaiting serial number
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-50"
                                        onClick={() => router.get(route('warranties.batch-record'))}
                                    >
                                        Record Serials
                                    </Button>
                                </div>
                            </PermissionGate>
                        )}
                        {inRepairCount > 0 && (
                            <button
                                className="text-sm text-blue-600 mt-0.5 flex items-center gap-1.5 hover:underline"
                                onClick={() => setStatus('in_repair')}
                            >
                                <Truck className="h-3.5 w-3.5" />
                                {inRepairCount} item{inRepairCount === 1 ? '' : 's'} sent to supplier — awaiting return
                            </button>
                        )}
                        {defectiveSentCount > 0 && (
                            <button
                                className="text-sm text-orange-600 mt-0.5 flex items-center gap-1.5 hover:underline"
                                onClick={() => setStatus('defective_sent')}
                            >
                                <PackageCheck className="h-3.5 w-3.5" />
                                {defectiveSentCount} defective unit{defectiveSentCount === 1 ? '' : 's'} sent to supplier — awaiting return to inventory
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search receipt, customer, serial…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All Active" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Active</SelectItem>
                            <SelectItem value="pending_serial">Pending Serial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="in_repair">Sent for Repair — Awaiting Return</SelectItem>
                            <SelectItem value="defective_sent">Defective Sent — Awaiting Return to Inventory</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Receipt #</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Serial Number</TableHead>
                                    <TableHead>Coverage</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Claims</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warranties.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                            No warranties found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    warranties.data.map((w) => {
                                        const isExpired = !!w.expires_at && new Date(w.expires_at) < new Date();
                                        const statusCfg = WARRANTY_STATUS[w.status] ?? WARRANTY_STATUS.active;
                                        return (
                                            <TableRow
                                                key={w.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.get(route('warranties.show', w.id))}
                                            >
                                                <TableCell className="font-mono text-sm">{w.receipt_number}</TableCell>
                                                <TableCell>{w.product?.name ?? `#${w.product_id}`}</TableCell>
                                                <TableCell>{w.customer_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                                <TableCell>
                                                    {w.serial_number
                                                        ? <span className="font-mono text-sm">{w.serial_number}</span>
                                                        : <span className="text-muted-foreground text-sm">Not recorded</span>}
                                                </TableCell>
                                                <TableCell>{w.warranty_months} mo.</TableCell>
                                                <TableCell>
                                                    {w.expires_at ? (
                                                        <span className={isExpired ? 'text-destructive font-medium' : ''}>
                                                            {formatDate(w.expires_at)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {w.open_claims_count > 0 ? (
                                                        <Badge variant="destructive" className="gap-1">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {w.open_claims_count} open
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {isExpired && w.status === 'active' ? (
                                                        <Badge variant="secondary">Expired</Badge>
                                                    ) : (
                                                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => router.get(route('warranties.show', w.id))}
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <Pagination data={warranties} />
            </div>
        </AuthenticatedLayout>
    );
}
