import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDateOnly } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Plus, Search, Eye, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Bill, PaginatedData, Supplier } from '@/types';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    unpaid:         { label: 'Unpaid',      variant: 'secondary' },
    partially_paid: { label: 'Partial',     variant: 'outline' },
    paid:           { label: 'Paid',        variant: 'default' },
    overdue:        { label: 'Overdue',     variant: 'destructive' },
    voided:         { label: 'Voided',      variant: 'destructive' },
};

const CATEGORY_LABELS: Record<string, string> = {
    purchase_order: 'Purchase Order',
    rent:           'Rent',
    utilities:      'Utilities',
    internet:       'Internet',
    supplies:       'Supplies',
    other:          'Other',
};

interface Props {
    bills: PaginatedData<Bill>;
    filters: { search?: string; status?: string; category?: string; supplier_id?: string; date_from?: string; date_to?: string };
    totalOutstanding: number;
    totalOverdue: number;
    dueThisWeek: number;
    suppliers: Supplier[];
}

export default function BillsIndex({ bills, filters, totalOutstanding, totalOverdue, dueThisWeek, suppliers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('bills.index'),
            { ...filters, search: debouncedSearch || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleFilter = (key: string, value: string) => {
        router.get(
            route('bills.index'),
            { ...filters, search: search || undefined, [key]: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header="Accounts Payable">
            <Head title="Bills" />

            <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <DollarSign className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Outstanding</p>
                                <p className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <AlertTriangle className="h-8 w-8 text-destructive" />
                            <div>
                                <p className="text-sm text-muted-foreground">Overdue</p>
                                <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <Clock className="h-8 w-8 text-orange-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Due This Week</p>
                                <p className="text-2xl font-bold text-orange-600">{formatCurrency(dueThisWeek)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search bill # or supplier..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filters.status ?? 'all'} onValueChange={(v) => handleFilter('status', v)}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="partially_paid">Partial</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="voided">Voided</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filters.category ?? 'all'} onValueChange={(v) => handleFilter('category', v)}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                                <SelectItem value="rent">Rent</SelectItem>
                                <SelectItem value="utilities">Utilities</SelectItem>
                                <SelectItem value="internet">Internet</SelectItem>
                                <SelectItem value="supplies">Supplies</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <PermissionGate permission="ap.create">
                        <Button asChild>
                            <Link href={route('bills.create')}>
                                <Plus className="mr-2 h-4 w-4" /> New Bill
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bill #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bills.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        No bills found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bills.data.map((bill) => {
                                    const statusInfo = STATUS_LABELS[bill.status] ?? { label: bill.status, variant: 'secondary' as const };
                                    return (
                                        <TableRow key={bill.id}>
                                            <TableCell className="font-medium">{bill.bill_number}</TableCell>
                                            <TableCell>{bill.supplier_name}</TableCell>
                                            <TableCell>{CATEGORY_LABELS[bill.category] ?? bill.category}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(bill.total_amount)}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {bill.balance > 0 ? (
                                                    <span className="text-red-600">{formatCurrency(bill.balance)}</span>
                                                ) : (
                                                    formatCurrency(0)
                                                )}
                                            </TableCell>
                                            <TableCell>{formatDateOnly(bill.due_date)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('bills.show', bill.id)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {bills.last_page > 1 && (
                    <Pagination links={bills.links} />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
