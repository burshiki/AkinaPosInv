import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/Components/app/permission-gate';
import {
    ShoppingCart,
    DollarSign,
    Package,
    AlertTriangle,
    TrendingUp,
    CreditCard,
} from 'lucide-react';
import type { Product, Sale } from '@/types';

interface DashboardProps {
    stats: {
        today_sales_count: number;
        today_revenue: number;
        total_products: number;
        low_stock_count: number;
        outstanding_debts: number;
        total_bank_balance: number;
    };
    recent_sales: Sale[];
    low_stock_products: Product[];
}

export default function DashboardIndex({ stats, recent_sales, low_stock_products }: DashboardProps) {
    return (
        <AuthenticatedLayout header="Dashboard">
            <Head title="Dashboard" />

            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.today_sales_count}</div>
                            <p className="text-xs text-muted-foreground">transactions today</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(stats.today_revenue)}</div>
                            <p className="text-xs text-muted-foreground">from completed sales</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_products}</div>
                            <p className="text-xs text-muted-foreground">active products</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{stats.low_stock_count}</div>
                            <p className="text-xs text-muted-foreground">need restocking</p>
                        </CardContent>
                    </Card>

                    <PermissionGate permission="banking.view">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(stats.total_bank_balance)}</div>
                                <p className="text-xs text-muted-foreground">across all accounts</p>
                            </CardContent>
                        </Card>
                    </PermissionGate>

                    <PermissionGate permission="debts.view">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Outstanding Debts</CardTitle>
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstanding_debts)}</div>
                                <p className="text-xs text-muted-foreground">to be collected</p>
                            </CardContent>
                        </Card>
                    </PermissionGate>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Sales */}
                    <PermissionGate permission="sales.view">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Recent Sales</CardTitle>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/sales">View All</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {recent_sales.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No sales today</p>
                                ) : (
                                    <div className="space-y-3">
                                        {recent_sales.map((sale) => (
                                            <div key={sale.id} className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <div className="text-sm font-medium">{sale.receipt_number}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {sale.user?.name} &middot; {sale.payment_method}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">{formatCurrency(sale.total)}</div>
                                                    <Badge variant={sale.status === 'completed' ? 'success' : 'destructive'} className="text-xs">
                                                        {sale.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </PermissionGate>

                    {/* Low Stock Alerts */}
                    <PermissionGate permission="inventory.view">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/products">View All</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {low_stock_products.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                                ) : (
                                    <div className="space-y-3">
                                        {low_stock_products.map((product) => (
                                            <div key={product.id} className="flex items-center justify-between rounded-md border p-3">
                                                <div>
                                                    <div className="text-sm font-medium">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                                </div>
                                                <Badge variant={product.stock_quantity <= 0 ? 'destructive' : 'warning'}>
                                                    {product.stock_quantity <= 0 ? 'Out of Stock' : `${product.stock_quantity} left`}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </PermissionGate>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
