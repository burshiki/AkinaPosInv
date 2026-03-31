import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ReceiptPrinter } from '@/Components/app/receipt-printer';
import { ArrowLeft, RotateCcw, Truck } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { Sale, SaleShipping } from '@/types';

interface Props {
    sale: Sale & { shipping?: SaleShipping | null };
}

export default function SalesShow({ sale }: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const confirmForm = useForm({ shipping_fee: '', courier: sale.shipping?.courier ?? '', tracking_number: '', notes: '' });

    const feeVariant = (status: string) => {
        switch (status) {
            case 'paid': return 'success' as const;
            case 'confirmed': return 'default' as const;
            default: return 'outline' as const;
        }
    };

    const feeLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'confirmed': return 'Confirmed';
            default: return 'Pending';
        }
    };

    const handleConfirmFee = (e: React.FormEvent) => {
        e.preventDefault();
        confirmForm.post(route('sale-shippings.confirm-fee', sale.shipping!.id), {
            onSuccess: () => setConfirmOpen(false),
        });
    };

    const handleMarkPaid = () => {
        router.post(route('sale-shippings.mark-paid', sale.shipping!.id));
    };

    const statusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success' as const;
            case 'voided': return 'destructive' as const;
            default: return 'secondary' as const;
        }
    };

    return (
        <>
        <AuthenticatedLayout header={`Sale: ${sale.receipt_number}`}>
            <Head title={`Sale ${sale.receipt_number}`} />

            <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('sales.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
                        </Link>
                    </Button>
                    <Badge variant={statusVariant(sale.status)} className="text-sm">
                        {sale.status.toUpperCase()}
                    </Badge>
                    {sale.status === 'completed' && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('sales.return', sale.id)}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Return Items
                            </Link>
                        </Button>
                    )}
                </div>

                <ReceiptPrinter sale={sale} />

                {/* Shipping Panel */}
                {sale.shipping && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                <Truck className="h-4 w-4" />
                                Delivery / Shipping
                                <Badge variant={feeVariant(sale.shipping.fee_status)} className="ml-auto normal-case text-xs">
                                    {feeLabel(sale.shipping.fee_status)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Address</span>
                                    <span className="text-right max-w-xs">{sale.shipping.shipping_address}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping Fee</span>
                                    <span className="font-mono font-medium">
                                        {sale.shipping.shipping_fee !== null ? formatCurrency(Number(sale.shipping.shipping_fee)) : <span className="text-muted-foreground italic">TBD</span>}
                                    </span>
                                </div>
                                {sale.shipping.courier && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Courier</span>
                                        <span>{sale.shipping.courier}</span>
                                    </div>
                                )}
                                {sale.shipping.tracking_number && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tracking #</span>
                                        <span className="font-mono">{sale.shipping.tracking_number}</span>
                                    </div>
                                )}
                                {sale.shipping.notes && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Notes</span>
                                        <span className="text-right max-w-xs">{sale.shipping.notes}</span>
                                    </div>
                                )}
                            </div>

                            {sale.shipping.fee_status === 'pending' && (
                                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
                                    Shipping fee not yet confirmed. Update it once the courier confirms the amount.
                                </div>
                            )}

                            <div className="flex gap-2">
                                {sale.shipping.fee_status !== 'paid' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        <Truck className="mr-1.5 h-3.5 w-3.5" />
                                        {sale.shipping.fee_status === 'pending' ? 'Confirm Fee' : 'Update Fee'}
                                    </Button>
                                )}
                                {sale.shipping.fee_status === 'confirmed' && (
                                    <Button
                                        size="sm"
                                        className="border-green-500 text-green-700 hover:bg-green-50"
                                        variant="outline"
                                        onClick={handleMarkPaid}
                                    >
                                        Mark as Paid
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AuthenticatedLayout>

        {/* Confirm Shipping Fee Dialog */}
        {sale.shipping && (
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" /> Confirm Shipping Fee
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleConfirmFee} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
                            <p><span className="text-muted-foreground">To: </span>{sale.shipping.shipping_address}</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-fee">Shipping Fee (₱) *</Label>
                            <Input
                                id="sf-fee"
                                type="number"
                                min="0"
                                step="0.01"
                                value={confirmForm.data.shipping_fee}
                                onChange={(e) => confirmForm.setData('shipping_fee', e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                            {confirmForm.errors.shipping_fee && <p className="text-sm text-destructive">{confirmForm.errors.shipping_fee}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-courier">Courier</Label>
                            <Input
                                id="sf-courier"
                                value={confirmForm.data.courier}
                                onChange={(e) => confirmForm.setData('courier', e.target.value)}
                                placeholder="e.g. J&T, LBC, GrabExpress"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="sf-tracking">Tracking Number</Label>
                            <Input
                                id="sf-tracking"
                                value={confirmForm.data.tracking_number}
                                onChange={(e) => confirmForm.setData('tracking_number', e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={confirmForm.processing}>Confirm Fee</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        )}
    </>
    );
}
