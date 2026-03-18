import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import AcceptModal from './AcceptModal';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, Plus, Wrench, Eye, Printer, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { RepairJob, Customer, PaginatedData } from '@/types';

const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' }> = {
    pending:     { label: 'Pending',     variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'default' },
    done:        { label: 'Done',        variant: 'secondary' },
    claimed:     { label: 'Claimed',     variant: 'success' },
};

interface Props {
    repairs: PaginatedData<RepairJob>;
    filters: { search?: string; status?: string };
    counts:  { pending: number; in_progress: number; done: number };
    customers: Pick<Customer, 'id' | 'name' | 'phone'>[];
}

export default function RepairsIndex({ repairs, filters, counts, customers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [acceptOpen, setAcceptOpen] = useState(false);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('repairs.index'),
            { search: debouncedSearch || undefined, status: status !== 'all' ? status : undefined },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, status]);

    return (
        <AuthenticatedLayout>
            <Head title="Repairs" />
            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Wrench className="h-6 w-6" />
                        Repairs
                    </h1>
                    <PermissionGate permission="repairs.create">
                        <Button onClick={() => setAcceptOpen(true)}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Accept Repair
                        </Button>
                    </PermissionGate>
                </div>

                {/* Stat badges */}
                <div className="flex flex-wrap gap-3">
                    {[
                        { key: 'pending',     label: 'Awaiting Start', count: counts.pending,     color: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200' },
                        { key: 'in_progress', label: 'In Progress',    count: counts.in_progress, color: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200' },
                        { key: 'done',        label: 'Ready to Claim', count: counts.done,        color: 'border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200' },
                    ].map(({ key, label, count, color }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setStatus(status === key ? 'all' : key)}
                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-opacity ${color} ${status !== key && status !== 'all' ? 'opacity-50' : ''}`}
                        >
                            {count} {label}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search job #, customer, problem…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="claimed">Claimed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <ScrollArea className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead className="max-w-xs">Problem</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Technician</TableHead>
                                <TableHead>Accepted</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {repairs.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                                        No repair jobs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                repairs.data.map((job) => {
                                    const cfg = STATUS_CFG[job.status] ?? { label: job.status, variant: 'outline' as const };
                                    return (
                                        <TableRow key={job.id} className="cursor-pointer" onClick={() => router.get(route('repairs.show', job.id))}>
                                            <TableCell className="font-mono text-sm font-medium">{job.job_number}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{job.customer_name}</div>
                                                {job.customer_phone && (
                                                    <div className="text-xs text-muted-foreground">{job.customer_phone}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                <span className="line-clamp-2 text-sm">{job.problem_description}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{job.technician?.name ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{formatDate(job.accepted_at)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="View Job"
                                                        onClick={() => router.get(route('repairs.show', job.id))}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {job.status === 'done' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Process Payment"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => router.get(route('sales.create'), { repair_job_id: job.id })}
                                                        >
                                                            <ShoppingCart className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Print Claim Stub"
                                                        onClick={() => window.open(route('repairs.stub', job.id), '_blank')}
                                                    >
                                                        <Printer className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>

                <Pagination data={repairs} />
            </div>

            <AcceptModal open={acceptOpen} onClose={() => setAcceptOpen(false)} customers={customers} />
        </AuthenticatedLayout>
    );
}
