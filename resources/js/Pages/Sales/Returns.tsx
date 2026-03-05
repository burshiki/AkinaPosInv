import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import type { PaginatedData, SaleReturn } from '@/types';

interface Props {
    returns: PaginatedData<SaleReturn>;
    filters: { search: string; date_from: string; date_to: string };
}

export default function ReturnsIndex({ returns, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        if (debouncedSearch !== (filters.search || '')) {
            router.get(route('returns.index'), { search: debouncedSearch }, { preserveState: true, replace: true });
        }
    }, [debouncedSearch]);

    return (
        <AuthenticatedLayout header="Returns & Refunds">
            <Head title="Returns" />

            <div className="space-y-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search return number, customer..."
                                className="pl-9"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return #</TableHead>
                                    <TableHead>Sale #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Refund</TableHead>
                                    <TableHead>Processed By</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {returns.data.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.return_number}</TableCell>
                                        <TableCell>
                                            <Link href={route('sales.show', r.sale_id)} className="text-primary hover:underline">
                                                {r.sale?.receipt_number}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{r.customer_name || '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.type === 'refund' ? 'destructive' : 'secondary'}>
                                                {r.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(r.total_refund)}</TableCell>
                                        <TableCell>{(r as any).processed_by_user?.name || '—'}</TableCell>
                                        <TableCell>{formatDate(r.returned_at)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link href={route('returns.show', r.id)}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {returns.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                            No returns found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
