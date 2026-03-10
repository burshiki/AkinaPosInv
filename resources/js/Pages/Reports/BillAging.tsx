import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface AgingSupplier {
    supplier_name: string;
    supplier_id: number | null;
    current: number;
    aging_1_30: number;
    aging_31_60: number;
    aging_61_90: number;
    aging_over_90: number;
    total: number;
}

interface Props {
    report: {
        suppliers: AgingSupplier[];
        totals: {
            current: number;
            aging_1_30: number;
            aging_31_60: number;
            aging_61_90: number;
            aging_over_90: number;
            total: number;
        };
    };
}

export default function BillAgingReport({ report }: Props) {
    return (
        <AuthenticatedLayout header="AP Aging Report">
            <Head title="AP Aging Report" />

            <div className="space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('reports.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
                    </Link>
                </Button>

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Payable</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totals.total)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Not Yet Due</p>
                            <p className="text-2xl font-bold">{formatCurrency(report.totals.current)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">1-30 Days</p>
                            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(report.totals.aging_1_30)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">31-60 Days</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.totals.aging_31_60)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">61-90 Days</p>
                            <p className="text-2xl font-bold text-orange-700">{formatCurrency(report.totals.aging_61_90)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Over 90 Days</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totals.aging_over_90)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Supplier Aging Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Supplier Aging Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead className="text-right">Not Yet Due</TableHead>
                                    <TableHead className="text-right">1-30d</TableHead>
                                    <TableHead className="text-right">31-60d</TableHead>
                                    <TableHead className="text-right">61-90d</TableHead>
                                    <TableHead className="text-right">90+d</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.suppliers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                                            No outstanding bills
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {report.suppliers.map((supplier, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">{supplier.supplier_name}</TableCell>
                                                <TableCell className="text-right">
                                                    {supplier.current > 0 ? formatCurrency(supplier.current) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {supplier.aging_1_30 > 0 ? (
                                                        <span className="text-yellow-600">{formatCurrency(supplier.aging_1_30)}</span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {supplier.aging_31_60 > 0 ? (
                                                        <span className="text-orange-600">{formatCurrency(supplier.aging_31_60)}</span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {supplier.aging_61_90 > 0 ? (
                                                        <span className="text-orange-700">{formatCurrency(supplier.aging_61_90)}</span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {supplier.aging_over_90 > 0 ? (
                                                        <span className="text-red-600 font-bold">{formatCurrency(supplier.aging_over_90)}</span>
                                                    ) : '—'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(supplier.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                        {/* Totals Row */}
                                        <TableRow className="bg-muted/50 font-bold">
                                            <TableCell>Total</TableCell>
                                            <TableCell className="text-right">{formatCurrency(report.totals.current)}</TableCell>
                                            <TableCell className="text-right text-yellow-600">{formatCurrency(report.totals.aging_1_30)}</TableCell>
                                            <TableCell className="text-right text-orange-600">{formatCurrency(report.totals.aging_31_60)}</TableCell>
                                            <TableCell className="text-right text-orange-700">{formatCurrency(report.totals.aging_61_90)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(report.totals.aging_over_90)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(report.totals.total)}</TableCell>
                                        </TableRow>
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
