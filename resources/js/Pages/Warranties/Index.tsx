import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { formatDate } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, ShieldCheck, ClipboardList, Wrench, CheckCircle2, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Warranty, PaginatedData } from '@/types';
import { PermissionGate } from '@/Components/app/permission-gate';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending:          { label: 'Pending Serial',   variant: 'outline' },
    active:           { label: 'Active',           variant: 'default' },
    checking:         { label: 'Checking',         variant: 'outline' },
    confirmed:        { label: 'Issue Confirmed',  variant: 'destructive' },
    sent_to_supplier: { label: 'Sent to Supplier', variant: 'secondary' },
    expired:          { label: 'Expired',          variant: 'secondary' },
};

interface Props {
    warranties: PaginatedData<Warranty>;
    pendingCount: number;
    filters: { search?: string; status?: string };
    suppliers: { id: number; name: string }[];
}

export default function WarrantiesIndex({ warranties, pendingCount, filters, suppliers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const debouncedSearch = useDebounce(search, 300);

    const [serialDialogOpen, setSerialDialogOpen] = useState(false);
    const [checkDialogOpen, setCheckDialogOpen] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

    const form = useForm({
        serial_number: '',
        notes: '',
    });

    const checkForm = useForm({ check_reason: '' });
    const sendForm  = useForm({ supplier_id: '', tracking_number: '' });

    // Auto-reload on search/filter change
    useEffect(() => {
        router.get(
            route('warranties.index'),
            {
                search: debouncedSearch || undefined,
                status: status !== 'all' ? status : undefined,
            },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, status]);

    function openRecordSerial(warranty: Warranty) {
        setSelectedWarranty(warranty);
        form.setData({ serial_number: '', notes: '' });
        form.clearErrors();
        setSerialDialogOpen(true);
    }

    function submitSerial(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarranty) return;
        form.post(route('warranties.record-serial', selectedWarranty.id), {
            onSuccess: () => setSerialDialogOpen(false),
        });
    }

    function openCheckDialog(warranty: Warranty) {
        setSelectedWarranty(warranty);
        checkForm.setData('check_reason', warranty.check_reason ?? '');
        checkForm.clearErrors();
        setCheckDialogOpen(true);
    }

    function submitCheck(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarranty) return;
        checkForm.post(route('warranties.check', selectedWarranty.id), {
            onSuccess: () => setCheckDialogOpen(false),
        });
    }

    function confirmWarranty(warranty: Warranty) {
        router.post(route('warranties.confirm', warranty.id));
    }

    function openSendDialog(warranty: Warranty) {
        setSelectedWarranty(warranty);
        sendForm.setData({ supplier_id: '', tracking_number: '' });
        sendForm.clearErrors();
        setSendDialogOpen(true);
    }

    function submitSend(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarranty) return;
        sendForm.post(route('warranties.send-to-supplier', selectedWarranty.id), {
            onSuccess: () => setSendDialogOpen(false),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Warranties" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6" />
                            Warranties
                        </h1>
                        {pendingCount > 0 && (
                            <p className="text-sm text-amber-600 mt-0.5">
                                {pendingCount} warrant{pendingCount === 1 ? 'y' : 'ies'} awaiting serial number
                            </p>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search receipt, product, customer…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending Serial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="confirmed">Issue Confirmed</SelectItem>
                            <SelectItem value="sent_to_supplier">Sent to Supplier</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Receipt #</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Coverage</TableHead>
                                    <TableHead>Serial Number</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Sold On</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warranties.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                            No warranties found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    warranties.data.map((w) => {
                                        const statusCfg = STATUS_CONFIG[w.status] ?? STATUS_CONFIG.pending;
                                        return (
                                            <TableRow key={w.id}>
                                                <TableCell className="font-mono text-sm">{w.receipt_number}</TableCell>
                                                <TableCell>{w.product?.name ?? `Product #${w.product_id}`}</TableCell>
                                                <TableCell>{w.customer_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                                <TableCell>{w.warranty_months} mo.</TableCell>
                                                <TableCell>
                                                    {w.serial_number
                                                        ? <span className="font-mono text-sm">{w.serial_number}</span>
                                                        : <span className="text-muted-foreground text-sm">Not recorded</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {w.expires_at
                                                        ? formatDate(w.expires_at)
                                                        : <span className="text-muted-foreground text-sm">—</span>
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(w.created_at)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {w.status === 'pending' && (
                                                            <PermissionGate permission="warranties.record_serial">
                                                                <Button size="sm" variant="outline" onClick={() => openRecordSerial(w)}>
                                                                    <ClipboardList className="h-4 w-4 mr-1.5" />
                                                                    Record Serial
                                                                </Button>
                                                            </PermissionGate>
                                                        )}
                                                        {w.status === 'active' && (
                                                            <PermissionGate permission="warranties.check">
                                                                <Button size="sm" variant="outline" onClick={() => openCheckDialog(w)}>
                                                                    <Wrench className="h-4 w-4 mr-1.5" />
                                                                    Check
                                                                </Button>
                                                            </PermissionGate>
                                                        )}
                                                        {w.status === 'checking' && (
                                                            <PermissionGate permission="warranties.check">
                                                                <div className="flex items-center gap-2">
                                                                    <Button size="sm" variant="outline" onClick={() => openCheckDialog(w)}>
                                                                        <Wrench className="h-4 w-4 mr-1.5" />
                                                                        {w.check_reason ? 'Edit Reason' : 'Add Reason'}
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-40"
                                                                        disabled={!w.check_reason}
                                                                        title={!w.check_reason ? 'Add a reason before confirming' : ''}
                                                                        onClick={() => confirmWarranty(w)}
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                                        Confirm
                                                                    </Button>
                                                                </div>
                                                            </PermissionGate>
                                                        )}
                                                        {w.status === 'confirmed' && (
                                                            <PermissionGate permission="warranties.send_to_supplier">
                                                                <Button size="sm" onClick={() => openSendDialog(w)}>
                                                                    <Truck className="h-4 w-4 mr-1.5" />
                                                                    Send to Supplier
                                                                </Button>
                                                            </PermissionGate>
                                                        )}
                                                        {w.status === 'sent_to_supplier' && (
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {w.tracking_number ?? '—'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                {/* Pagination */}
                <Pagination data={warranties} />
            </div>

            {/* Record Serial Dialog */}
            <Dialog open={serialDialogOpen} onOpenChange={setSerialDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Serial Number</DialogTitle>
                    </DialogHeader>
                    {selectedWarranty && (
                        <form onSubmit={submitSerial} className="space-y-4">
                            {/* Info summary */}
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt</span>
                                    <span className="font-mono">{selectedWarranty.receipt_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product</span>
                                    <span>{selectedWarranty.product?.name ?? `#${selectedWarranty.product_id}`}</span>
                                </div>
                                {selectedWarranty.customer_name && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Customer</span>
                                        <span>{selectedWarranty.customer_name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coverage</span>
                                    <span>{selectedWarranty.warranty_months} months</span>
                                </div>
                            </div>

                            {/* Serial Number */}
                            <div className="space-y-1.5">
                                <Label htmlFor="w_serial">Serial Number *</Label>
                                <Input
                                    id="w_serial"
                                    value={form.data.serial_number}
                                    onChange={(e) => form.setData('serial_number', e.target.value)}
                                    placeholder="Enter serial number"
                                    autoFocus
                                />
                                {form.errors.serial_number && (
                                    <p className="text-sm text-destructive">{form.errors.serial_number}</p>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1.5">
                                <Label htmlFor="w_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                                <Textarea
                                    id="w_notes"
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    placeholder="Any additional notes…"
                                    rows={2}
                                />
                                {form.errors.notes && (
                                    <p className="text-sm text-destructive">{form.errors.notes}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSerialDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Save &amp; Activate
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Warranty Check Dialog */}
            <Dialog open={checkDialogOpen} onOpenChange={setCheckDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            <span className="flex items-center gap-2">
                                <Wrench className="h-5 w-5" />
                                Warranty Check
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedWarranty && (
                        <form onSubmit={submitCheck} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt</span>
                                    <span className="font-mono">{selectedWarranty.receipt_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product</span>
                                    <span>{selectedWarranty.product?.name ?? `#${selectedWarranty.product_id}`}</span>
                                </div>
                                {selectedWarranty.customer_name && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Customer</span>
                                        <span>{selectedWarranty.customer_name}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="check_reason">
                                    Reason / Issue
                                    <span className="text-muted-foreground ml-1 text-xs">(required before confirming)</span>
                                </Label>
                                <Textarea
                                    id="check_reason"
                                    value={checkForm.data.check_reason}
                                    onChange={(e) => checkForm.setData('check_reason', e.target.value)}
                                    placeholder="e.g. No power, screen cracked, not charging…"
                                    rows={3}
                                    autoFocus
                                />
                                {checkForm.errors.check_reason && (
                                    <p className="text-sm text-destructive">{checkForm.errors.check_reason}</p>
                                )}
                                {!checkForm.data.check_reason && (
                                    <p className="text-xs text-amber-500">
                                        If no reason is provided, status will remain <strong>Checking</strong>.
                                    </p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCheckDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={checkForm.processing}>
                                    Save &amp; Mark Checking
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Send to Supplier Dialog */}
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            <span className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Send to Supplier
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedWarranty && (
                        <form onSubmit={submitSend} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Receipt</span>
                                    <span className="font-mono">{selectedWarranty.receipt_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product</span>
                                    <span>{selectedWarranty.product?.name ?? `#${selectedWarranty.product_id}`}</span>
                                </div>
                                {selectedWarranty.check_reason && (
                                    <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground shrink-0">Issue</span>
                                        <span className="text-right">{selectedWarranty.check_reason}</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="send_supplier">Supplier *</Label>
                                <Select
                                    value={sendForm.data.supplier_id}
                                    onValueChange={(v) => sendForm.setData('supplier_id', v)}
                                >
                                    <SelectTrigger id="send_supplier">
                                        <SelectValue placeholder="Select supplier…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {sendForm.errors.supplier_id && (
                                    <p className="text-sm text-destructive">{sendForm.errors.supplier_id}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="tracking_number">Tracking Number *</Label>
                                <Input
                                    id="tracking_number"
                                    value={sendForm.data.tracking_number}
                                    onChange={(e) => sendForm.setData('tracking_number', e.target.value)}
                                    placeholder="Enter tracking number"
                                    autoFocus
                                />
                                {sendForm.errors.tracking_number && (
                                    <p className="text-sm text-destructive">{sendForm.errors.tracking_number}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSendDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={sendForm.processing}>
                                    <Truck className="h-4 w-4 mr-1.5" />
                                    Send to Supplier
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
