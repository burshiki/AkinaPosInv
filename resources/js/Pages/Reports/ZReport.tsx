import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { Badge } from '@/Components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Printer, DollarSign, ShoppingCart, ReceiptText, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { FormEvent, useState } from 'react';
import type { ZReport } from '@/types';

interface Props {
    report: ZReport;
    filters: { date: string; session_id: string };
}

export default function ZReportPage({ report, filters }: Props) {
    const [date, setDate] = useState(filters.date || new Date().toISOString().split('T')[0]);

    function generate(e: FormEvent) {
        e.preventDefault();
        router.get(route('reports.show', 'z-report'), { date }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout header="Z-Report (End of Day)">
            <Head title="Z-Report" />

            <div className="space-y-4 print:space-y-2">
                <div className="flex items-center justify-between print:hidden">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('reports.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                </div>

                {/* Date Filter */}
                <Card className="print:hidden">
                    <CardContent className="pt-6">
                        <form onSubmit={generate} className="flex items-end gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Report Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                            <Button type="submit">Generate</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Report Header */}
                <div className="text-center print:mb-2">
                    <h2 className="text-xl font-bold">Z-REPORT / END OF DAY</h2>
                    <p className="text-muted-foreground">{report.date}</p>
                </div>

                {/* Sales Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Transactions</p>
                            </div>
                            <p className="text-2xl font-bold">{report.sales.total_transactions}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Gross Revenue</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(report.sales.total_revenue)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <p className="text-sm text-muted-foreground">Gross Profit</p>
                            </div>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(report.sales.gross_profit)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Tax Collected</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(report.sales.total_tax_collected)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Sales by Payment Method */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Sales by Payment Method</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Method</TableHead>
                                    <TableHead className="text-right">Count</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.sales_by_method.map(m => (
                                    <TableRow key={m.method}>
                                        <TableCell className="capitalize font-medium">{m.method}</TableCell>
                                        <TableCell className="text-right">{m.count}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(m.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {report.sales_by_method.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">No sales</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Voids */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Voids</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Void count</span>
                                <span className="font-medium">{report.voids.count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Void total</span>
                                <span className="font-medium text-red-600">{formatCurrency(report.voids.total)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Returns */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Returns / Refunds</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Return count</span>
                                <span className="font-medium">{report.returns.count}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Refund total</span>
                                <span className="font-medium text-red-600">{formatCurrency(report.returns.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax refunded</span>
                                <span className="font-medium">{formatCurrency(report.returns.tax_refund)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed P&L */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between"><span>Gross Revenue</span><span className="font-medium">{formatCurrency(report.sales.total_revenue)}</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Less: Discounts</span><span>({formatCurrency(report.sales.total_discount)})</span></div>
                        <div className="flex justify-between text-muted-foreground"><span>Less: Cost of Goods</span><span>({formatCurrency(report.sales.total_cost)})</span></div>
                        <Separator />
                        <div className="flex justify-between font-bold"><span>Gross Profit</span><span className="text-green-600">{formatCurrency(report.sales.gross_profit)}</span></div>
                        <div className="flex justify-between text-sm text-muted-foreground"><span>Tax Collected</span><span>{formatCurrency(report.sales.total_tax_collected)}</span></div>
                        <div className="flex justify-between text-sm text-muted-foreground"><span>Average Sale</span><span>{formatCurrency(report.sales.average_sale)}</span></div>
                    </CardContent>
                </Card>

                {/* Cash Drawer */}
                {report.cash_drawer && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Wallet className="h-4 w-4" /> Cash Drawer
                                <Badge variant={report.cash_drawer.status === 'closed' ? 'secondary' : 'default'}>
                                    {report.cash_drawer.status}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <div className="flex justify-between"><span>Cashier</span><span>{report.cash_drawer.cashier}</span></div>
                            <div className="flex justify-between"><span>Opening Balance</span><span>{formatCurrency(report.cash_drawer.opening_balance)}</span></div>
                            <div className="flex justify-between"><span>Cash Sales</span><span>{formatCurrency(report.cash_drawer.cash_sales)}</span></div>
                            <div className="flex justify-between text-muted-foreground"><span>Change Given</span><span>({formatCurrency(report.cash_drawer.change_given)})</span></div>
                            <div className="flex justify-between text-muted-foreground"><span>Transfers Out</span><span>({formatCurrency(report.cash_drawer.transfers_out)})</span></div>
                            <div className="flex justify-between text-muted-foreground"><span>Transfers In</span><span>+{formatCurrency(report.cash_drawer.transfers_in)}</span></div>
                            {report.cash_drawer.petty_cash_expenses > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Petty Cash Expenses (Cash)</span><span>({formatCurrency(report.cash_drawer.petty_cash_expenses)})</span></div>
                            )}
                            {report.cash_drawer.bank_expenses > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Petty Cash Expenses (Bank/GCash)</span><span className="text-blue-600">{formatCurrency(report.cash_drawer.bank_expenses)} (no cash impact)</span></div>
                            )}
                            {report.cash_drawer.cash_debt_payments > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Debt Payments (Cash)</span><span>+{formatCurrency(report.cash_drawer.cash_debt_payments)}</span></div>
                            )}
                            {report.cash_drawer.online_debt_payments > 0 && (
                                <div className="flex justify-between text-muted-foreground"><span>Debt Payments (Online)</span><span className="text-muted-foreground">{formatCurrency(report.cash_drawer.online_debt_payments)} (to bank)</span></div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-bold"><span>Expected Cash</span><span>{formatCurrency(report.cash_drawer.expected_cash)}</span></div>
                            {report.cash_drawer.closing_balance !== null && (
                                <>
                                    <div className="flex justify-between"><span>Actual Closing</span><span>{formatCurrency(report.cash_drawer.closing_balance)}</span></div>
                                    <div className={`flex justify-between font-bold ${(report.cash_drawer.variance ?? 0) < 0 ? 'text-red-600' : (report.cash_drawer.variance ?? 0) > 0 ? 'text-green-600' : ''}`}>
                                        <span className="flex items-center gap-1">
                                            Variance
                                            {(report.cash_drawer.variance ?? 0) !== 0 && <AlertTriangle className="h-3 w-3" />}
                                        </span>
                                        <span>{formatCurrency(report.cash_drawer.variance ?? 0)}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between text-sm text-muted-foreground"><span>Opened</span><span>{report.cash_drawer.opened_at}</span></div>
                            {report.cash_drawer.closed_at && (
                                <div className="flex justify-between text-sm text-muted-foreground"><span>Closed</span><span>{report.cash_drawer.closed_at}</span></div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Bank Account Movements */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Account Movements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Inflows</TableHead>
                                    <TableHead className="text-right">Outflows</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.account_movements.map(a => (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">
                                            {a.bank_name ? `${a.bank_name} - ${a.name}` : a.name}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">{formatCurrency(a.inflows)}</TableCell>
                                        <TableCell className="text-right text-red-600">{formatCurrency(a.outflows)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(a.balance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Top Products */}
                {report.top_products.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Top Selling Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Qty Sold</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.top_products.map((p, idx) => (
                                        <TableRow key={p.name}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="text-right">{p.qty_sold}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
