import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { StockBadge } from '@/Components/app/stock-badge';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Puzzle } from 'lucide-react';
import type { Product } from '@/types';

interface Props {
    product: Product;
}

export default function ProductsShow({ product }: Props) {
    return (
        <AuthenticatedLayout header={`Product: ${product.name}`}>
            <Head title={product.name} />

            <div className="mx-auto max-w-3xl space-y-6">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('products.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{product.name}</CardTitle>
                            <div className="flex gap-2">
                                <StockBadge quantity={product.stock_quantity} threshold={product.low_stock_threshold} />
                                {product.is_assembled && <Badge variant="secondary">Assembled</Badge>}
                                {!product.is_active && <Badge variant="destructive">Inactive</Badge>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">SKU</p>
                                <p className="font-mono font-medium">{product.sku}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Barcode</p>
                                <p className="font-mono font-medium">{product.barcode ?? '—'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Category</p>
                                <p className="font-medium">{product.category?.name ?? 'Uncategorized'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Description</p>
                                <p>{product.description || '—'}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <p className="text-sm text-muted-foreground">Cost Price</p>
                                <p className="text-lg font-medium">{formatCurrency(product.cost_price)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Selling Price</p>
                                <p className="text-lg font-medium">{formatCurrency(product.selling_price)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Margin</p>
                                <p className="text-lg font-medium">
                                    {formatCurrency(product.selling_price - product.cost_price)}
                                    <span className="ml-1 text-sm text-muted-foreground">
                                        ({product.cost_price > 0
                                            ? (((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)
                                            : '0'}%)
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Quantity</p>
                                <p className="text-lg font-medium">{product.stock_quantity}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Low Stock Threshold</p>
                                <p className="text-lg font-medium">{product.low_stock_threshold}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assembly Components (BOM) */}
                {product.is_assembled && product.assembly_components && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Puzzle className="h-5 w-5" />
                                <CardTitle className="text-lg">Bill of Materials</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {product.assembly_components.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No components configured yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="text-right">Qty Needed</TableHead>
                                            <TableHead className="text-right">Available</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {product.assembly_components.map((comp) => (
                                            <TableRow key={comp.id}>
                                                <TableCell className="font-medium">{comp.component_product?.name}</TableCell>
                                                <TableCell className="font-mono text-sm">{comp.component_product?.sku}</TableCell>
                                                <TableCell className="text-right">{comp.quantity_needed}</TableCell>
                                                <TableCell className="text-right">{comp.component_product?.stock_quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency((comp.component_product?.cost_price ?? 0) * comp.quantity_needed)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
