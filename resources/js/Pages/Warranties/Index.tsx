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
import { Search, ShieldCheck, ClipboardList, Wrench, CheckCircle2, Truck, PackageCheck, RefreshCw, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Warranty, PaginatedData } from '@/types';import { PermissionGate } from '@/Components/app/permission-gate';

interface InfoRow { label: string; value: React.ReactNode; }

function WarrantyInfoSummary({ warranty, extras = [] }: { warranty: Warranty; extras?: InfoRow[] }) {
    return (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt</span>
                <span className="font-mono">{warranty.receipt_number}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <span>{warranty.product?.name ?? `#${warranty.product_id}`}</span>
            </div>
            {warranty.customer_name && (
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span>{warranty.customer_name}</span>
                </div>
            )}
            {extras.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="text-right">{value}</span>
                </div>
            ))}
        </div>
    );
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending:               { label: 'Pending Serial',        variant: 'outline' },
    active:                { label: 'Active',                variant: 'default' },
    checking:              { label: 'Checking',              variant: 'outline' },
    confirmed:             { label: 'Issue Confirmed',       variant: 'destructive' },
    replacement_requested: { label: 'Replacement Requested', variant: 'destructive' },
    sent_to_supplier:      { label: 'Sent for Repair',       variant: 'secondary' },
    replaced:              { label: 'Replaced',              variant: 'default' },
    replacement_received:  { label: 'Replacement Received',  variant: 'default' },
    repair_received:       { label: 'Repair Received',       variant: 'default' },
    refunded:              { label: 'Refunded',              variant: 'secondary' },
    expired:               { label: 'Expired',               variant: 'secondary' },
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
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

    const form = useForm({
        serial_number: '',
        notes: '',
    });

    const checkForm   = useForm({ check_reason: '' });
    const resolveForm = useForm({ resolution_type: '', supplier_id: '', tracking_number: '', received_serial_number: '', received_notes: '' });
    const receiveForm = useForm({ received_serial_number: '', received_notes: '' });

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
        if (confirmingId === warranty.id) return;

        setConfirmingId(warranty.id);
        router.post(route('warranties.confirm', warranty.id), {}, {
            onFinish: () => setConfirmingId(null),
        });
    }

    function openResolveDialog(warranty: Warranty) {
        setSelectedWarranty(warranty);
        resolveForm.reset();
        resolveForm.clearErrors();
        // Pre-select replacement for legacy replacement_requested records
        if (warranty.status === 'replacement_requested') {
            resolveForm.setData('resolution_type', 'replacement');
        }
        setResolveDialogOpen(true);
    }

    function submitResolve(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarranty || !resolveForm.data.resolution_type) return;
        if (resolveForm.data.resolution_type === 'refund') {
            router.post(route('warranties.refund', selectedWarranty.id), {}, {
                onSuccess: () => setResolveDialogOpen(false),
            });
            return;
        }
        if (resolveForm.data.resolution_type === 'replacement') {
            resolveForm.post(route('warranties.replace-from-stock', selectedWarranty.id), {
                onSuccess: () => setResolveDialogOpen(false),
            });
            return;
        }
        // repair
        resolveForm.post(route('warranties.send-to-supplier', selectedWarranty.id), {
            onSuccess: () => setResolveDialogOpen(false),
        });
    }

    function openReceiveDialog(warranty: Warranty) {
        setSelectedWarranty(warranty);
        receiveForm.setData({ received_serial_number: '', received_notes: '' });
        receiveForm.clearErrors();
        setReceiveDialogOpen(true);
    }

    function submitReceive(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarranty) return;
        receiveForm.post(route('warranties.receive-replacement', selectedWarranty.id), {
            onSuccess: () => setReceiveDialogOpen(false),
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
                            <SelectItem value="replacement_requested">Replacement Requested</SelectItem>
                            <SelectItem value="sent_to_supplier">Sent for Repair</SelectItem>
                            <SelectItem value="replaced">Replaced</SelectItem>
                            <SelectItem value="replacement_received">Replacement Received</SelectItem>
                            <SelectItem value="repair_received">Repair Received</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
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
                                                                        disabled={!w.check_reason || confirmingId === w.id}
                                                                        title={!w.check_reason ? 'Add a reason before confirming' : ''}
                                                                        onClick={() => confirmWarranty(w)}
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                                        {confirmingId === w.id ? 'Confirming...' : 'Confirm'}
                                                                    </Button>
                                                                </div>
                                                            </PermissionGate>
                                                        )}
                                                        {(w.status === 'confirmed' || w.status === 'replacement_requested') && (
                                                            <PermissionGate permission="warranties.send_to_supplier">
                                                                <Button size="sm" onClick={() => openResolveDialog(w)}>
                                                                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                                                                    Resolve (3 R's)
                                                                </Button>
                                                            </PermissionGate>
                                                        )}
                                                        {w.status === 'sent_to_supplier' && (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    {w.tracking_number ?? '—'}
                                                                </span>
                                                                <PermissionGate permission="warranties.send_to_supplier">
                                                                    <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => openReceiveDialog(w)}>
                                                                        <PackageCheck className="h-4 w-4 mr-1.5" />
                                                                        Receive Repaired
                                                                    </Button>
                                                                </PermissionGate>
                                                            </div>
                                                        )}
                                                        {(w.status === 'replaced' || w.status === 'replacement_received' || w.status === 'repair_received') && (
                                                            <div className="flex items-center gap-2">
                                                                {w.received_serial_number && (
                                                                    <span className="font-mono text-xs text-muted-foreground">{w.received_serial_number}</span>
                                                                )}
                                                                <Badge variant="outline" className="text-green-600 border-green-500">
                                                                    {w.status === 'repair_received' ? 'Repaired' : 'Replaced'}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                        {w.status === 'refunded' && (
                                                            <Badge variant="outline" className="text-blue-600 border-blue-400">Refunded</Badge>
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
                            <WarrantyInfoSummary
                                warranty={selectedWarranty}
                                extras={[{ label: 'Coverage', value: `${selectedWarranty.warranty_months} months` }]}
                            />

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
                            <WarrantyInfoSummary warranty={selectedWarranty} />

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

            {/* Resolve Warranty Dialog — RA 7394 Three R's (Repair / Replacement / Refund) */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            <span className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                Resolve Warranty Claim
                                <Badge variant="outline" className="text-xs font-normal">RA 7394</Badge>
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedWarranty && (() => {
                        const daysSince = Math.floor((Date.now() - new Date(selectedWarranty.created_at).getTime()) / (1000 * 60 * 60 * 24));
                        const withinSevenDays = daysSince <= 7;
                        return (
                            <form onSubmit={submitResolve} className="space-y-4">
                                {/* Warranty info */}
            <WarrantyInfoSummary
                                warranty={selectedWarranty}
                                extras={selectedWarranty.check_reason ? [{ label: 'Issue', value: selectedWarranty.check_reason }] : []}
                            />

                                {/* 7-day window indicator */}
                                <div className={`flex flex-wrap items-center gap-x-2 rounded-md px-3 py-2 text-xs ${withinSevenDays ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                                    <span className="font-semibold">{withinSevenDays ? '✓ Within 7-day replacement window' : '⚠ Outside 7-day window'}</span>
                                    <span>— {daysSince === 0 ? 'same day as purchase' : `${daysSince} day${daysSince !== 1 ? 's' : ''} since purchase`}</span>
                                    {withinSevenDays && <span className="ml-auto font-medium">Immediate from-stock swap applicable</span>}
                                </div>

                                {/* Three R's */}
                                <div>
                                    <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Resolution Type</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { type: 'repair' as const, icon: Wrench, label: 'Repair', desc: 'Send to supplier/ASC for repair' },
                                            { type: 'replacement' as const, icon: RefreshCw, label: 'Replacement', desc: 'Give customer a new unit from store inventory now' },
                                            { type: 'refund' as const, icon: Banknote, label: 'Refund', desc: 'Return full purchase price to customer' },
                                        ]).map(({ type, icon: Icon, label, desc }) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => resolveForm.setData('resolution_type', type)}
                                                className={`rounded-lg border p-3 text-left transition-all ${
                                                    resolveForm.data.resolution_type === type
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-muted hover:border-muted-foreground/40'
                                                }`}
                                            >
                                                <Icon className={`mb-1.5 h-4 w-4 ${resolveForm.data.resolution_type === type ? 'text-primary' : 'text-muted-foreground'}`} />
                                                <p className="text-xs font-semibold">{label}</p>
                                                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Replacement — immediate from stock */}
                                {resolveForm.data.resolution_type === 'replacement' && (
                                    <div className="space-y-3">
                                        <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                            <strong>Immediate replacement from store inventory.</strong> 1 unit of <strong>{selectedWarranty.product?.name}</strong> will be deducted from stock and handed to the customer now. No supplier wait time.
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="replacement_serial">New Unit Serial Number <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                id="replacement_serial"
                                                value={resolveForm.data.received_serial_number}
                                                onChange={(e) => resolveForm.setData('received_serial_number', e.target.value)}
                                                placeholder="Serial number of the new unit given"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="replacement_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                id="replacement_notes"
                                                value={resolveForm.data.received_notes}
                                                onChange={(e) => resolveForm.setData('received_notes', e.target.value)}
                                                placeholder="e.g. New unit given on the spot"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Repair — send to supplier/ASC */}
                                {resolveForm.data.resolution_type === 'repair' && (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="resolve_supplier">Supplier / ASC <span className="text-muted-foreground">(optional)</span></Label>
                                            <Select
                                                value={resolveForm.data.supplier_id}
                                                onValueChange={(v) => resolveForm.setData('supplier_id', v)}
                                            >
                                                <SelectTrigger id="resolve_supplier">
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
                                            {resolveForm.errors.supplier_id && (
                                                <p className="text-sm text-destructive">{resolveForm.errors.supplier_id}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="resolve_tracking">Tracking Number <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                id="resolve_tracking"
                                                value={resolveForm.data.tracking_number}
                                                onChange={(e) => resolveForm.setData('tracking_number', e.target.value)}
                                                placeholder="Enter tracking number"
                                            />
                                            {resolveForm.errors.tracking_number && (
                                                <p className="text-sm text-destructive">{resolveForm.errors.tracking_number}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Refund confirmation note */}
                                {resolveForm.data.resolution_type === 'refund' && (
                                    <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                        The customer will receive a full refund of the purchase price (RA 7394, Art. 68). This action is final.
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setResolveDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={resolveForm.processing || !resolveForm.data.resolution_type}>
                                        {resolveForm.data.resolution_type === 'refund'
                                            ? <><Banknote className="h-4 w-4 mr-1.5" />Issue Refund</>
                                            : resolveForm.data.resolution_type === 'repair'
                                            ? <><Truck className="h-4 w-4 mr-1.5" />Send for Repair</>
                                            : resolveForm.data.resolution_type === 'replacement'
                                            ? <><RefreshCw className="h-4 w-4 mr-1.5" />Replace from Inventory</>
                                            : 'Select a Resolution'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Receive from Supplier Dialog */}
            <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            <span className="flex items-center gap-2">
                                <PackageCheck className="h-5 w-5" />
                                Receive Repaired Item
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedWarranty && (
                        <form onSubmit={submitReceive} className="space-y-4">
                            <WarrantyInfoSummary
                            warranty={selectedWarranty}
                            extras={[
                                ...(selectedWarranty.supplier ? [{ label: 'Supplier', value: selectedWarranty.supplier.name }] : []),
                                ...(selectedWarranty.tracking_number ? [{ label: 'Tracking', value: <span className="font-mono">{selectedWarranty.tracking_number}</span> }] : []),
                            ]}
                        />

                            {selectedWarranty.resolution_type === 'repair' ? (
                                <p className="text-sm text-muted-foreground">
                                    Confirm that the repaired item has been received back from the supplier/ASC. No stock adjustment will be made.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Receiving this replacement will add <strong>1 unit</strong> of <strong>{selectedWarranty.product?.name}</strong> back into stock.
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="received_serial">
                                    {selectedWarranty.resolution_type === 'repair' ? 'Serial Number' : 'Replacement Serial Number'} <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="received_serial"
                                    value={receiveForm.data.received_serial_number}
                                    onChange={(e) => receiveForm.setData('received_serial_number', e.target.value)}
                                    placeholder="Serial number of the replacement unit"
                                    autoFocus
                                />
                                {receiveForm.errors.received_serial_number && (
                                    <p className="text-sm text-destructive">{receiveForm.errors.received_serial_number}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="received_notes">
                                    Notes <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="received_notes"
                                    value={receiveForm.data.received_notes}
                                    onChange={(e) => receiveForm.setData('received_notes', e.target.value)}
                                    placeholder="Any notes about the received replacement…"
                                    rows={2}
                                />
                                {receiveForm.errors.received_notes && (
                                    <p className="text-sm text-destructive">{receiveForm.errors.received_notes}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setReceiveDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={receiveForm.processing} className="bg-green-600 hover:bg-green-700 text-white">
                                    <PackageCheck className="h-4 w-4 mr-1.5" />
                                    {selectedWarranty.resolution_type === 'repair' ? 'Confirm Received' : 'Receive \u0026 Add to Stock'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
