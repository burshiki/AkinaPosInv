import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, Eye, CreditCard, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CustomerSummary {
    customer_name: string;
    customer_phone: string | null;
    total_debt: number;
    total_paid: number;
    outstanding_balance: number;
    debt_count: number;
}

interface Props {
    customers: CustomerSummary[];
    filters: { search?: string };
    totalOutstanding: number;
}

export default function DebtsIndex({ customers, filters, totalOutstanding }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(
            route('debts.index'),
            { search: debouncedSearch || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    return (
        <AuthenticatedLayout>
            <Head title="Customer Debts" />

            <div className="space-y-6 p-6">
                {/* Back */}
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('customers.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Customers
                    </Link>
                </Button>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CreditCard className="h-6 w-6" />
                        Customer Debts
                    </h1>
                    <Card className="w-auto">
                        <CardContent className="flex items-center gap-3 p-4">
                            <CreditCard className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="text-right">Total Debt</TableHead>
                                <TableHead className="text-right">Paid</TableHead>
                                <TableHead className="text-right">Outstanding</TableHead>
                                <TableHead className="text-center">Debts</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No outstanding debts
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow key={customer.customer_name}>
                                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                                        <TableCell>{customer.customer_phone || '—'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(customer.total_debt)}</TableCell>
                                        <TableCell className="text-right text-green-600">{formatCurrency(customer.total_paid)}</TableCell>
                                        <TableCell className="text-right font-bold text-red-600">
                                            {formatCurrency(customer.outstanding_balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{customer.debt_count}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={route('debts.show', customer.customer_name)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>                    </ScrollArea>                </div>
            </div>
        </AuthenticatedLayout>
    );
}
