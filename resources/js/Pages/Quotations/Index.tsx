import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, Plus, ClipboardList, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Quotation, PaginatedData } from '@/types';

const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft:    { label: 'Draft',    variant: 'outline' },
    sent:     { label: 'Sent',     variant: 'default' },
    accepted: { label: 'Accepted', variant: 'default' },
    expired:  { label: 'Expired',  variant: 'secondary' },
};

interface Props {
    quotations: PaginatedData<Quotation & { items_count: number }>;
    filters:    { search?: string; status?: string };
}

export default function QuotationsIndex({ quotations, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('quotations.index'),
            { search: debouncedSearch || undefined, status: status !== 'all' ? status : undefined },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, status]);

    return (
        <AuthenticatedLayout>
            <Head title="Quotations" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        Quotations
                    </h1>
                    <Button onClick={() => router.get(route('quotations.create'))}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Quotation
                    </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search quotation # or customer…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Quotation #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Valid Until</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {quotations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            No quotations found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    quotations.data.map((q) => {
                                        const cfg = STATUS_CFG[q.status] ?? STATUS_CFG.draft;
                                        const isOverdue = !!q.valid_until && new Date(q.valid_until) < new Date() && q.status !== 'accepted';
                                        return (
                                            <TableRow
                                                key={q.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => router.get(route('quotations.show', q.id))}
                                            >
                                                <TableCell className="font-mono text-sm font-medium">{q.quotation_number}</TableCell>
                                                <TableCell>{q.customer_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                                <TableCell>{q.items_count}</TableCell>
                                                <TableCell className="font-medium">{formatCurrency(q.total)}</TableCell>
                                                <TableCell>
                                                    {q.valid_until
                                                        ? <span className={isOverdue ? 'text-destructive' : ''}>{formatDate(q.valid_until)}</span>
                                                        : <span className="text-muted-foreground">—</span>}
                                                </TableCell>
                                                <TableCell><Badge variant={cfg.variant}>{cfg.label}</Badge></TableCell>
                                                <TableCell>{formatDate(q.created_at)}</TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button size="sm" variant="ghost" onClick={() => router.get(route('quotations.show', q.id))}>
                                                        <Eye className="h-4 w-4 mr-1" /> View
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

                <Pagination data={quotations} />
            </div>
        </AuthenticatedLayout>
    );
}
