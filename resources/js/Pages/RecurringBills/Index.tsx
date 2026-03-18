import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDateOnly } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { useConfirm } from '@/Components/app/confirm-dialog';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { RecurringBillTemplate, PaginatedData } from '@/types';

const FREQUENCY_LABELS: Record<string, string> = {
    monthly:   'Monthly',
    quarterly: 'Quarterly',
    annually:  'Annually',
};

const CATEGORY_LABELS: Record<string, string> = {
    rent:      'Rent',
    utilities: 'Utilities',
    internet:  'Internet',
    supplies:  'Supplies',
    other:     'Other',
};

interface Props {
    templates: PaginatedData<RecurringBillTemplate>;
    filters: { search?: string; status?: string };
}

export default function RecurringBillsIndex({ templates, filters }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('recurring-bills.index'),
            { search: debouncedSearch || undefined, status: filters.status || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleStatusFilter = (value: string) => {
        router.get(
            route('recurring-bills.index'),
            { search: search || undefined, status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const handleDeactivate = async (template: RecurringBillTemplate) => {
        const ok = await confirm({
            title: 'Deactivate Template',
            description: `Deactivate "${template.name}"? No more bills will be generated from this template.`,
            confirmLabel: 'Deactivate',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('recurring-bills.destroy', template.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Recurring Bills" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <RefreshCw className="h-6 w-6" />
                        Recurring Bills
                    </h1>
                    <PermissionGate permission="ap.create">
                        <Button asChild>
                            <Link href={route('recurring-bills.create')}>
                                <Plus className="h-4 w-4 mr-1.5" /> New Template
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={filters.status ?? 'all'} onValueChange={handleStatusFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Next Gen. Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-24"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {templates.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No recurring bill templates found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                templates.data.map((tpl) => (
                                    <TableRow key={tpl.id}>
                                        <TableCell className="font-medium">{tpl.name}</TableCell>
                                        <TableCell>{tpl.supplier_name || tpl.supplier?.name || '—'}</TableCell>
                                        <TableCell>{CATEGORY_LABELS[tpl.category] ?? tpl.category}</TableCell>
                                        <TableCell>{FREQUENCY_LABELS[tpl.frequency] ?? tpl.frequency}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(tpl.amount)}</TableCell>
                                        <TableCell>{formatDateOnly(tpl.next_generate_date)}</TableCell>
                                        <TableCell>
                                            <Badge variant={tpl.is_active ? 'success' : 'secondary'}>
                                                {tpl.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('recurring-bills.edit', tpl.id)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {tpl.is_active && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeactivate(tpl)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>                    </ScrollArea>                </div>

                <Pagination data={templates} />
            </div>
        </AuthenticatedLayout>
    );
}
