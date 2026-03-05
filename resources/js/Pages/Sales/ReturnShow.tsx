import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import type { SaleReturn } from '@/types';

interface Props {
    saleReturn: SaleReturn;
}

export default function ReturnShow({ saleReturn }: Props) {
    return (
        <AuthenticatedLayout header={`Return: ${saleReturn.return_number}`}>
            <Head title={`Return ${saleReturn.return_number}`} />

            <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('returns.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Returns
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Badge variant={saleReturn.type === 'refund' ? 'destructive' : 'secondary'}>
                            {saleReturn.type}
                        </Badge>
                        <Badge variant="outline">{saleReturn.refund_method}</Badge>
                    </div>
                </div>

                {/* Return Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Return Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <dt className="text-muted-foreground">Return Number</dt>
                            <dd className="font-medium">{saleReturn.return_number}</dd>

                            <dt className="text-muted-foreground">Original Sale</dt>
                            <dd>
                                <Link href={route('sales.show', saleReturn.sale_id)} className="text-primary hover:underline font-medium">
                                    {saleReturn.sale?.receipt_number}
                                </Link>
                            </dd>

                            <dt className="text-muted-foreground">Customer</dt>
                            <dd>{saleReturn.customer_name || '—'}</dd>

                            <dt className="text-muted-foreground">Processed By</dt>
                            <dd>{(saleReturn as any).processed_by_user?.name || (saleReturn as any).processedBy?.name || '—'}</dd>

                            <dt className="text-muted-foreground">Date</dt>
                            <dd>{formatDate(saleReturn.returned_at)}</dd>

                            <dt className="text-muted-foreground">Refund Method</dt>
                            <dd className="capitalize">{saleReturn.refund_method}</dd>

                            {saleReturn.bank_account && (
                                <>
                                    <dt className="text-muted-foreground">Bank Account</dt>
                                    <dd>{(saleReturn.bank_account as any).account_name || (saleReturn.bank_account as any).bank_name}</dd>
                                </>
                            )}
                        </dl>
                    </CardContent>
                </Card>

                {/* Returned Items */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Returned Items</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Refund</TableHead>
                                    <TableHead className="text-center">Restocked</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {saleReturn.items?.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.product_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.product_sku}</TableCell>
                                        <TableCell className="text-center">{item.quantity_returned}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.refund_amount)}</TableCell>
                                        <TableCell className="text-center">
                                            {item.restock ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Refund Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            {saleReturn.tax_refund > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tax Refund</span>
                                    <span>{formatCurrency(saleReturn.tax_refund)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-semibold text-base">
                                <span>Total Refund</span>
                                <span className="text-destructive">{formatCurrency(saleReturn.total_refund)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Reason & Notes */}
                {(saleReturn.reason || saleReturn.notes) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Reason & Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {saleReturn.reason && (
                                <div>
                                    <span className="text-muted-foreground">Reason:</span>
                                    <p className="mt-1">{saleReturn.reason}</p>
                                </div>
                            )}
                            {saleReturn.notes && (
                                <div>
                                    <span className="text-muted-foreground">Notes:</span>
                                    <p className="mt-1">{saleReturn.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
