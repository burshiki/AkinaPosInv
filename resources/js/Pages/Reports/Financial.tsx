import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface FinancialReportData {
    period: { start: string; end: string };
    profit_loss: {
        total_revenue: number;
        total_cost: number;
        gross_profit: number;
        margin_percentage: number;
    };
    accounts: {
        id: number;
        name: string;
        type: string;
        balance: number;
        total_inflows: number;
        total_outflows: number;
    }[];
    total_balance: number;
}

interface Props {
    report: FinancialReportData | null;
    filters: { start_date: string; end_date: string };
}

export default function FinancialReport({ report, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(filters.end_date || new Date().toISOString().split('T')[0]);

    function generate(e: FormEvent) {
        e.preventDefault();
        router.get(route('reports.show', 'financial'), { start_date: startDate, end_date: endDate }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout header="Financial Report">
            <Head title="Financial Report" />

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
                        {/* P&L Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Profit & Loss</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Revenue</p>
                                        <p className="text-2xl font-bold">{formatCurrency(report.profit_loss.total_revenue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cost of Goods</p>
                                        <p className="text-2xl font-bold text-red-600">{formatCurrency(report.profit_loss.total_cost)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Gross Profit</p>
                                        <p className="text-2xl font-bold text-green-600">{formatCurrency(report.profit_loss.gross_profit)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Margin</p>
                                        <p className="text-2xl font-bold">{report.profit_loss.margin_percentage.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Bank Account Summaries */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Account Summaries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Account</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Inflows</TableHead>
                                            <TableHead className="text-right">Outflows</TableHead>
                                            <TableHead className="text-right">Current Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.accounts.map((account) => (
                                            <TableRow key={account.id}>
                                                <TableCell className="font-medium">{account.name}</TableCell>
                                                <TableCell className="capitalize">{account.type}</TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatCurrency(account.total_inflows)}
                                                </TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {formatCurrency(account.total_outflows)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatCurrency(account.balance)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <Separator className="my-4" />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total Balance</span>
                                    <span>{formatCurrency(report.total_balance)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
