import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Download } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SalesReportData {
    period: { start: string; end: string };
    summary: {
        total_sales: number;
        total_revenue: number;
        total_cost: number;
        total_profit: number;
        average_sale: number;
        voided_count: number;
    };
    daily: {
        date: string;
        count: number;
        revenue: number;
        cost: number;
        profit: number;
    }[];
    top_products: {
        name: string;
        quantity_sold: number;
        revenue: number;
    }[];
}

interface Props {
    report: SalesReportData | null;
    filters: { start_date: string; end_date: string };
}

export default function SalesReport({ report, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(filters.end_date || new Date().toISOString().split('T')[0]);

    function generate(e: FormEvent) {
        e.preventDefault();
        router.get(route('reports.show', 'sales'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout header="Sales Report">
            <Head title="Sales Report" />

            <div className="space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('reports.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
                    </Link>
                </Button>

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={generate} className="flex flex-wrap items-end gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">End Date</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                            <Button type="submit">Generate Report</Button>
                        </form>
                    </CardContent>
                </Card>

                {report && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">Total Sales</p>
                                    <p className="text-2xl font-bold">{report.summary.total_sales}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">Revenue</p>
                                    <p className="text-2xl font-bold">{formatCurrency(report.summary.total_revenue)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">Profit</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(report.summary.total_profit)}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <p className="text-sm text-muted-foreground">Avg Per Sale</p>
                                    <p className="text-2xl font-bold">{formatCurrency(report.summary.average_sale)}</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Daily Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Sales</TableHead>
                                            <TableHead className="text-right">Revenue</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead className="text-right">Profit</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.daily.map((day) => (
                                            <TableRow key={day.date}>
                                                <TableCell>{day.date}</TableCell>
                                                <TableCell className="text-right">{day.count}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(day.revenue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(day.cost)}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {formatCurrency(day.profit)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {report.daily.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                    No sales in this period
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Top Products */}
                        {report.top_products.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Products</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-right">Qty Sold</TableHead>
                                                <TableHead className="text-right">Revenue</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {report.top_products.map((product, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-medium">{product.name}</TableCell>
                                                    <TableCell className="text-right">{product.quantity_sold}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
