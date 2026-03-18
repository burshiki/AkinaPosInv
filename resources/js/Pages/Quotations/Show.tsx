import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Printer, Mail, Trash2, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import type { Quotation } from '@/types';

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft:    { label: 'Draft',    variant: 'outline' },
    sent:     { label: 'Sent',     variant: 'default' },
    accepted: { label: 'Accepted', variant: 'default' },
    expired:  { label: 'Expired',  variant: 'secondary' },
};

interface Props {
    quotation: Quotation;
    appName:   string;
}

export default function QuotationShow({ quotation, appName }: Props) {
    const [emailOpen, setEmailOpen]   = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const emailForm = useForm({ email: quotation.customer_email ?? '' });
    const cfg       = STATUS_STYLES[quotation.status] ?? STATUS_STYLES.draft;

    const discountValue = quotation.discount_type === 'percentage'
        ? quotation.subtotal * (quotation.discount_amount / 100)
        : quotation.discount_amount;

    function submitEmail(e: React.FormEvent) {
        e.preventDefault();
        emailForm.post(route('quotations.send-email', quotation.id), {
            onSuccess: () => setEmailOpen(false),
        });
    }

    function updateStatus(status: string) {
        router.post(route('quotations.update-status', quotation.id), { status }, { preserveState: true });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Quotation ${quotation.quotation_number}`} />
            <div className="max-w-4xl mx-auto space-y-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => router.get(route('quotations.index'))}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold font-mono">{quotation.quotation_number}</h1>
                            <p className="text-xs text-muted-foreground">
                                {formatDate(quotation.created_at)}
                                {quotation.user && ` · by ${quotation.user.name}`}
                            </p>
                        </div>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => router.post(route('quotations.proceed-to-sale', quotation.id))}>
                            <ShoppingCart className="h-4 w-4 mr-1.5" /> Proceed to Sale
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(route('quotations.print', quotation.id), '_blank')}>
                            <Printer className="h-4 w-4 mr-1.5" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
                            <Mail className="h-4 w-4 mr-1.5" /> Send Email
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                        </Button>
                    </div>
                </div>

                {/* Status quick-update */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Mark as:</span>
                    {(['draft', 'sent', 'accepted', 'expired'] as const).filter((s) => s !== quotation.status).map((s) => (
                        <Button key={s} variant="outline" size="sm" className="h-7 text-xs capitalize" onClick={() => updateStatus(s)}>
                            {s}
                        </Button>
                    ))}
                </div>

                {/* Customer & meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 space-y-1.5 text-sm">
                        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                        {quotation.customer_name
                            ? <>
                                <p className="font-medium">{quotation.customer_name}</p>
                                {quotation.customer_email && <p className="text-muted-foreground">{quotation.customer_email}</p>}
                                {quotation.customer_phone && <p className="text-muted-foreground">{quotation.customer_phone}</p>}
                              </>
                            : <p className="text-muted-foreground">No customer specified</p>
                        }
                    </div>
                    <div className="rounded-lg border p-4 space-y-1.5 text-sm">
                        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Details</p>
                        <div className="flex justify-between"><span className="text-muted-foreground">Quotation #</span><span className="font-mono">{quotation.quotation_number}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(quotation.created_at)}</span></div>
                        {quotation.valid_until && (
                            <div className="flex justify-between"><span className="text-muted-foreground">Valid Until</span><span>{formatDate(quotation.valid_until)}</span></div>
                        )}
                    </div>
                </div>

                {/* Items */}
                <div className="rounded-lg border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quotation.items?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product_name}</TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">{item.product_sku ?? '—'}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-60 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(quotation.subtotal)}</span>
                        </div>
                        {discountValue > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>Discount{quotation.discount_type === 'percentage' ? ` (${quotation.discount_amount}%)` : ''}</span>
                                <span>-{formatCurrency(discountValue)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-2">
                            <span>Total</span>
                            <span>{formatCurrency(quotation.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {quotation.notes && (
                    <div className="rounded-lg border p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
                    </div>
                )}
            </div>

            {/* Send Email Dialog */}
            <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Send Quotation by Email
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitEmail} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Recipient Email</Label>
                            <Input type="email" autoFocus
                                value={emailForm.data.email}
                                onChange={(e) => emailForm.setData('email', e.target.value)}
                                placeholder="customer@example.com"
                            />
                            {emailForm.errors.email && <p className="text-xs text-destructive">{emailForm.errors.email}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={emailForm.processing}>
                                {emailForm.processing ? 'Sending…' : 'Send'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Delete Quotation?</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will delete quotation {quotation.quotation_number}. This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => router.delete(route('quotations.destroy', quotation.id))}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
