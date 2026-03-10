import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { StockBadge } from '@/Components/app/stock-badge';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Download } from 'lucide-react';

interface InventoryItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    stock: number;
    reorder_level: number;
    cost_price: number;
    selling_price: number;
    stock_value: number;
    is_assembled: boolean;
}

interface InventoryReportData {
    summary: {
        total_products: number;
        total_stock_value: number;
        low_stock_count: number;
        out_of_stock_count: number;
    };
    items: InventoryItem[];
    low_stock_items: InventoryItem[];
}

interface Props {
    report: InventoryReportData;
}

export default function InventoryReport({ report }: Props) {
    return (
        <AuthenticatedLayout header="Inventory Report">
            <Head title="Inventory Report" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('reports.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={route('exports.inventory')} download>
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </a>
                    </Button>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Products</p>
                            <p className="text-2xl font-bold">{report.summary.total_products}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Stock Value</p>
                            <p className="text-2xl font-bold">{formatCurrency(report.summary.total_stock_value)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Low Stock Items</p>
                            <p className="text-2xl font-bold text-yellow-600">{report.summary.low_stock_count}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600">{report.summary.out_of_stock_count}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Low Stock Alerts */}
                {report.low_stock_items.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-red-600">Low Stock Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead className="text-right">Stock</TableHead>
                                        <TableHead className="text-right">Reorder Level</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.low_stock_items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                                            <TableCell className="text-right">{item.stock}</TableCell>
                                            <TableCell className="text-right">{item.reorder_level}</TableCell>
                                            <TableCell>
                                                <StockBadge quantity={item.stock} threshold={item.reorder_level} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Full Inventory */}
                <Card>
                    <CardHeader>
                        <CardTitle>Full Inventory</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Stock Value</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {report.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.name}
                                            {item.is_assembled && (
                                                <Badge variant="outline" className="ml-2">Assembled</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-right">{item.stock}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.cost_price)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.selling_price)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.stock_value)}</TableCell>
                                        <TableCell>
                                            <StockBadge quantity={item.stock} threshold={item.reorder_level} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {report.items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                                            No products found
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
