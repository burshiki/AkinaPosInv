import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Download } from 'lucide-react';

interface AgingCustomer {
    customer_name: string;
    customer_phone: string | null;
    current: number;      // 0-30 days
    aging_31_60: number;
    aging_61_90: number;
    aging_over_90: number;
    total: number;
}

interface DebtAgingReportData {
    summary: {
        total_outstanding: number;
        total_customers: number;
        current: number;
        aging_31_60: number;
        aging_61_90: number;
        aging_over_90: number;
    };
    customers: AgingCustomer[];
}

interface Props {
    report: DebtAgingReportData;
}

export default function DebtAgingReport({ report }: Props) {
    const agingVariant = (amount: number) => {
        if (amount <= 0) return 'outline' as const;
        return 'destructive' as const;
    };

    return (
        <AuthenticatedLayout header="Debt Aging Report">
            <Head title="Debt Aging Report" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('reports.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={route('exports.debt-aging')} download>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </a>
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.summary.total_outstanding)}</p>
                            <p className="text-xs text-muted-foreground">{report.summary.total_customers} customers</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Current (0-30d)</p>
                            <p className="text-2xl font-bold">{formatCurrency(report.summary.current)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">31-60 Days</p>
                            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(report.summary.aging_31_60)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">61-90 Days</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(report.summary.aging_61_90)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Over 90 Days</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(report.summary.aging_over_90)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Customer Aging Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Aging Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead className="text-right">Current (0-30d)</TableHead>
                                    <TableHead className="text-right">31-60d</TableHead>
                                    <TableHead className="text-right">61-90d</TableHead>
                                    <TableHead className="text-right">90+d</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.customers.map((customer, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{customer.customer_name}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {customer.customer_phone || '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customer.current > 0 ? formatCurrency(customer.current) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customer.aging_31_60 > 0 ? (
                                                <span className="text-yellow-600">{formatCurrency(customer.aging_31_60)}</span>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customer.aging_61_90 > 0 ? (
                                                <span className="text-orange-600">{formatCurrency(customer.aging_61_90)}</span>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {customer.aging_over_90 > 0 ? (
                                                <span className="text-red-600 font-bold">{formatCurrency(customer.aging_over_90)}</span>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCurrency(customer.total)}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={route('debts.show', customer.customer_name)}>
                                                    View
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.customers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No outstanding debts
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
