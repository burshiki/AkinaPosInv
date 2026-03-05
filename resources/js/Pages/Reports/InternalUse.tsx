import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Printer, Search, PackageMinus, DollarSign, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ByProduct {
    id: number;
    name: string;
    sku: string | null;
    total_qty: number;
    cost_price: number;
    total_cost: number;
}

interface Transaction {
    id: number;
    date: string;
    product_name: string;
    product_sku: string | null;
    change_qty: number;
    cost_price: number;
    reason: string | null;
    user: string | null;
}

interface Report {
    period: { start: string; end: string };
    filters: { reason?: string };
    summary: { total_records: number; total_qty_consumed: number; total_cost: number };
    by_product: ByProduct[];
    transactions: Transaction[];
}

interface Props {
    report: Report | null;
    filters: { start_date?: string; end_date?: string; reason?: string };
}

export default function InternalUseReport({ report, filters }: Props) {
    const [startDate, setStartDate] = useState(filters.start_date ?? '');
    const [endDate,   setEndDate]   = useState(filters.end_date   ?? '');
    const [reason,    setReason]    = useState(filters.reason     ?? '');
    const debouncedReason = useDebounce(reason, 300);

    useEffect(() => {
        if (!startDate && !endDate) return;
        router.get(
            route('reports.show', 'internal-use'),
            { start_date: startDate || undefined, end_date: endDate || undefined, reason: debouncedReason || undefined },
            { preserveState: true, replace: true },
        );
    }, [startDate, endDate, debouncedReason]);

    function buildPrintUrl() {
        const params = new URLSearchParams();
        if (startDate)       params.set('start_date', startDate);
        if (endDate)         params.set('end_date', endDate);
        if (debouncedReason) params.set('reason', debouncedReason);
        return route('reports.internal-use.print') + (params.toString() ? '?' + params.toString() : '');
    }

    function runReport() {
        const today = new Date().toISOString().slice(0, 10);
        router.get(route('reports.show', 'internal-use'), {
            start_date: startDate || today,
            end_date:   endDate   || today,
            reason:     debouncedReason || undefined,
        });
    }

    return (
        <AuthenticatedLayout header="Internal Use Report">
            <Head title="Internal Use Report" />

            <div className="space-y-6 p-6">
                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="space-y-1.5">
                                <Label>From</Label>
                                <Input type="date" className="w-40" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>To</Label>
                                <Input type="date" className="w-40" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-48">
                                <Label>Reason (optional)</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="e.g. internal use, damaged…"
                                        className="pl-9"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={runReport}>Generate Report</Button>
                            {report && (
                                <Button variant="outline" onClick={() => window.open(buildPrintUrl(), '_blank')}>
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Print
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {!report ? (
                    <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                        Select a date range and click Generate Report.
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card>
                                <CardContent className="flex items-center gap-4 pt-6">
                                    <div className="rounded-lg bg-primary/10 p-2">
                                        <Hash className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{report.summary.total_records}</p>
                                        <p className="text-sm text-muted-foreground">Total Adjustments</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-4 pt-6">
                                    <div className="rounded-lg bg-orange-500/10 p-2">
                                        <PackageMinus className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{report.summary.total_qty_consumed.toLocaleString()}</p>
                                        <p className="text-sm text-muted-foreground">Units Consumed</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="flex items-center gap-4 pt-6">
                                    <div className="rounded-lg bg-destructive/10 p-2">
                                        <DollarSign className="h-5 w-5 text-destructive" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{formatCurrency(report.summary.total_cost)}</p>
                                        <p className="text-sm text-muted-foreground">Total Cost Value</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* By product */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Summary by Product</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Total Qty</TableHead>
                                            <TableHead className="text-right">Cost/Unit</TableHead>
                                            <TableHead className="text-right">Total Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.by_product.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell className="font-medium">{row.name}</TableCell>
                                                <TableCell className="font-mono text-sm text-muted-foreground">{row.sku ?? '—'}</TableCell>
                                                <TableCell className="text-right">{row.total_qty.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.cost_price)}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(row.total_cost)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/50 font-bold">
                                            <TableCell colSpan={4} className="text-right">Grand Total:</TableCell>
                                            <TableCell className="text-right">{formatCurrency(report.summary.total_cost)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Transactions */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Detailed Transactions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Cost/Unit</TableHead>
                                            <TableHead className="text-right">Total Cost</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {report.transactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                    No transactions found for this period.
                                                </TableCell>
                                            </TableRow>
                                        ) : report.transactions.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="whitespace-nowrap text-sm">{new Date(t.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{t.product_name}</TableCell>
                                                <TableCell className="font-mono text-sm text-muted-foreground">{t.product_sku ?? '—'}</TableCell>
                                                <TableCell className="text-right">{Math.abs(t.change_qty).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(t.cost_price)}</TableCell>
                                                <TableCell className="text-right font-bold">{formatCurrency(Math.abs(t.change_qty) * t.cost_price)}</TableCell>
                                                <TableCell className="text-sm max-w-xs truncate">{t.reason ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                                <TableCell className="text-sm">{t.user ?? '—'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {report.transactions.length > 0 && (
                                            <TableRow className="bg-muted/50 font-bold">
                                                <TableCell colSpan={5} className="text-right">Grand Total:</TableCell>
                                                <TableCell className="text-right">{formatCurrency(report.summary.total_cost)}</TableCell>
                                                <TableCell colSpan={2} />
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
