import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { PermissionGate } from '@/Components/app/permission-gate';
import {
    ShieldCheck, ClipboardList, ArrowLeft, Plus, Wrench, CheckCircle2,
    ThumbsUp, Truck, RefreshCw, Banknote, PackageCheck, ArrowRight, History,
    AlertTriangle, Printer,
} from 'lucide-react';
import { useState } from 'react';
import type { Warranty, WarrantyClaim, Supplier } from '@/types';

/* ── Status display config ── */

const WARRANTY_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' }> = {
    pending_serial: { label: 'Pending Serial', variant: 'outline' },
    active:         { label: 'Active',          variant: 'success' },
    replaced:       { label: 'Replaced',        variant: 'secondary' },
    void:           { label: 'Voided',          variant: 'secondary' },
};

const CLAIM_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' }> = {
    open:      { label: 'Open',       variant: 'destructive' },
    confirmed: { label: 'Confirmed',  variant: 'default' },
    in_repair: { label: 'In Repair',  variant: 'secondary' },
    resolved:  { label: 'Resolved',   variant: 'success' },
    no_defect: { label: 'No Defect',  variant: 'success' },
};

/* ── Props ── */

interface Props {
    warranty:  Warranty;
    suppliers: Supplier[];
}

/* ── Helper components ── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex justify-between py-2 px-4 text-sm border-b last:border-0">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-right">{value}</span>
        </div>
    );
}

function ChainNode({ w, isCurrent }: { w: Warranty; isCurrent?: boolean }) {
    const cfg = WARRANTY_STATUS[w.status] ?? WARRANTY_STATUS.active;
    const isExpired = !!w.expires_at && new Date(w.expires_at) < new Date();
    return (
        <div
            className={`rounded-lg border p-3 text-sm space-y-1 min-w-[180px] ${
                isCurrent
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'bg-muted/30 cursor-pointer hover:bg-muted/50'
            }`}
            onClick={isCurrent ? undefined : () => router.get(route('warranties.show', w.id))}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">#{w.id}</span>
                {isCurrent
                    ? <Badge variant="outline" className="text-primary border-primary text-xs">Current</Badge>
                    : isExpired
                    ? <Badge variant="secondary" className="text-xs">Expired</Badge>
                    : <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{w.serial_number ?? 'No serial'}</p>
            <p className="text-xs text-muted-foreground">{w.expires_at ? `Exp. ${formatDate(w.expires_at)}` : '—'}</p>
        </div>
    );
}

/* ── Main page ── */

export default function WarrantyShow({ warranty, suppliers }: Props) {
    const isExpired    = !!warranty.expires_at && new Date(warranty.expires_at) < new Date();
    const statusCfg    = WARRANTY_STATUS[warranty.status] ?? WARRANTY_STATUS.active;
    const claims       = warranty.claims ?? [];
    const activeClaim  = claims.find((c) => ['open', 'confirmed', 'in_repair'].includes(c.status));
    const hasChain     = !!(warranty.parent_warranty || warranty.child_warranty);

    /* Dialog states */
    const [newClaimOpen,         setNewClaimOpen]         = useState(false);
    const [serialOpen,           setSerialOpen]           = useState(false);
    const [confirmOpen,          setConfirmOpen]          = useState(false);
    const [noDefectOpen,         setNoDefectOpen]         = useState(false);
    const [resolveOpen,          setResolveOpen]          = useState(false);
    const [receiveBackOpen,      setReceiveBackOpen]      = useState(false);
    const [sendDefectiveOpen,    setSendDefectiveOpen]    = useState(false);
    const [receiveDefectiveOpen, setReceiveDefectiveOpen] = useState(false);
    const [activeClaim$,         setActiveClaim$]         = useState<WarrantyClaim | null>(null);

    /* Forms */
    const newClaimForm        = useForm({ issue_description: '' });
    const serialForm          = useForm({ serial_number: '', notes: '' });
    const confirmForm         = useForm({ issue_description: '' });
    const noDefectForm        = useForm({ issue_description: '', resolution_notes: '' });
    const resolveForm         = useForm({ resolution_type: '', supplier_id: '', tracking_number: '', received_serial_number: '', resolution_notes: '' });
    const receiveBackForm     = useForm({ received_serial_number: '', resolution_notes: '' });
    const sendDefectiveForm   = useForm({ supplier_id: '', defective_tracking_number: '' });
    const receiveDefectiveForm = useForm({ resolution_notes: '' });

    /* Handlers */
    function openConfirm(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        confirmForm.setData('issue_description', claim.issue_description ?? '');
        setConfirmOpen(true);
    }

    function openNoDefect(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        noDefectForm.setData({ issue_description: claim.issue_description ?? '', resolution_notes: '' });
        setNoDefectOpen(true);
    }

    function openResolve(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        resolveForm.reset();
        setResolveOpen(true);
    }

    function openReceiveBack(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        receiveBackForm.reset();
        setReceiveBackOpen(true);
    }

    function submitSerial(e: React.FormEvent) {
        e.preventDefault();
        serialForm.post(route('warranties.record-serial', warranty.id), {
            onSuccess: () => setSerialOpen(false),
        });
    }

    function submitNewClaim(e: React.FormEvent) {
        e.preventDefault();
        newClaimForm.post(route('warranty-claims.store', warranty.id), {
            onSuccess: () => setNewClaimOpen(false),
        });
    }

    function submitConfirm(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$) return;
        confirmForm.post(route('warranty-claims.confirm', activeClaim$.id), {
            onSuccess: () => setConfirmOpen(false),
        });
    }

    function submitNoDefect(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$) return;
        noDefectForm.post(route('warranty-claims.no-defect', activeClaim$.id), {
            onSuccess: () => setNoDefectOpen(false),
        });
    }

    function submitResolve(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$ || !resolveForm.data.resolution_type) return;

        if (resolveForm.data.resolution_type === 'refund') {
            router.post(route('warranty-claims.refund', activeClaim$.id), {}, {
                onSuccess: () => setResolveOpen(false),
            });
            return;
        }

        const hasStock = (warranty.product?.stock_quantity ?? 0) > 0;

        if (resolveForm.data.resolution_type === 'replacement' && hasStock) {
            // Immediate replacement from store inventory
            resolveForm.post(route('warranty-claims.replace-from-stock', activeClaim$.id), {
                onSuccess: () => setResolveOpen(false),
            });
            return;
        }

        // Repair OR replacement via supplier (no stock)
        resolveForm.post(route('warranty-claims.send-to-supplier', activeClaim$.id), {
            onSuccess: () => setResolveOpen(false),
        });
    }

    function submitReceiveBack(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$) return;
        receiveBackForm.post(route('warranty-claims.receive-back', activeClaim$.id), {
            onSuccess: () => setReceiveBackOpen(false),
        });
    }

    function openSendDefective(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        sendDefectiveForm.reset();
        setSendDefectiveOpen(true);
    }

    function openReceiveDefective(claim: WarrantyClaim) {
        setActiveClaim$(claim);
        receiveDefectiveForm.reset();
        setReceiveDefectiveOpen(true);
    }

    function submitSendDefective(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$) return;
        sendDefectiveForm.post(route('warranty-claims.send-defective-to-supplier', activeClaim$.id), {
            onSuccess: () => setSendDefectiveOpen(false),
        });
    }

    function submitReceiveDefective(e: React.FormEvent) {
        e.preventDefault();
        if (!activeClaim$) return;
        receiveDefectiveForm.post(route('warranty-claims.receive-defective-back', activeClaim$.id), {
            onSuccess: () => setReceiveDefectiveOpen(false),
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title={`Warranty #${warranty.id}`} />

            <div className="max-w-2xl mx-auto space-y-6 p-6">

                {/* Breadcrumb */}
                <Button variant="ghost" size="sm" asChild>
                    <Link href={route('warranties.index')}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Warranties
                    </Link>
                </Button>

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Warranty #{warranty.id}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {warranty.product?.name ?? `Product #${warranty.product_id}`}
                            {warranty.customer_name && ` — ${warranty.customer_name}`}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {isExpired && warranty.status === 'active'
                            ? <Badge variant="secondary">Expired</Badge>
                            : <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        }
                        {activeClaim && (
                            <Badge variant="destructive" className="text-xs">
                                {CLAIM_STATUS[activeClaim.status]?.label} Claim
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Warranty Details */}
                <div className="rounded-lg border divide-y">
                    <DetailRow label="Receipt #"  value={<span className="font-mono">{warranty.receipt_number}</span>} />
                    <DetailRow label="Product"    value={warranty.product?.name ?? `#${warranty.product_id}`} />
                    <DetailRow label="Customer"   value={warranty.customer_name ?? '—'} />
                    <DetailRow label="Serial No." value={
                        warranty.serial_number
                            ? <span className="font-mono">{warranty.serial_number}</span>
                            : <span className="text-muted-foreground">Not recorded</span>
                    } />
                    <DetailRow label="Coverage"   value={`${warranty.warranty_months} months`} />
                    <DetailRow label="Activated"  value={warranty.activated_at ? formatDate(warranty.activated_at) : '—'} />
                    <DetailRow label="Expires"    value={
                        warranty.expires_at
                            ? <span className={isExpired ? 'text-destructive font-medium' : ''}>{formatDate(warranty.expires_at)}</span>
                            : '—'
                    } />
                    {warranty.notes && <DetailRow label="Notes" value={warranty.notes} />}
                </div>

                {/* Primary Actions */}
                <div className="flex flex-wrap gap-2">
                    {(warranty.status === 'pending_serial' || (warranty.status === 'active' && !warranty.serial_number)) && (
                        <PermissionGate permission="warranties.record_serial">
                            <Button size="sm" onClick={() => { serialForm.reset(); setSerialOpen(true); }}>
                                <ClipboardList className="h-4 w-4 mr-1.5" />
                                {warranty.status === 'pending_serial' ? 'Record Serial & Activate' : 'Record Serial Number'}
                            </Button>
                        </PermissionGate>
                    )}
                    {warranty.status === 'active' && !isExpired && !activeClaim && (
                        <PermissionGate permission="warranties.check">
                            <Button size="sm" onClick={() => { newClaimForm.reset(); setNewClaimOpen(true); }}>
                                <Plus className="h-4 w-4 mr-1.5" />
                                New Claim
                            </Button>
                        </PermissionGate>
                    )}
                </div>

                {/* ── Claims ── */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Claims {claims.length > 0 && `(${claims.length})`}
                    </h2>

                    {claims.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No claims filed yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {claims.map((claim) => {
                                const cfg = CLAIM_STATUS[claim.status] ?? CLAIM_STATUS.open;
                                const isActive = ['open', 'confirmed', 'in_repair'].includes(claim.status);
                                return (
                                    <div
                                        key={claim.id}
                                        className={`rounded-lg border p-4 space-y-3 text-sm ${
                                            isActive ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800' : ''
                                        }`}
                                    >
                                        {/* Claim header */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-xs">{claim.claim_number}</span>
                                                <span className="text-muted-foreground text-xs">{formatDate(claim.created_at)}</span>
                                            </div>
                                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                        </div>

                                        {/* Issue description */}
                                        {claim.issue_description ? (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">Issue</p>
                                                <p>{claim.issue_description}</p>
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground italic">No issue description yet.</p>
                                        )}

                                        {/* Resolution info */}
                                        {claim.resolution_type && (
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                <span className="text-muted-foreground">Resolution</span>
                                                <span className="capitalize font-medium">{claim.resolution_type}</span>
                                                {claim.supplier && (
                                                    <>
                                                        <span className="text-muted-foreground">Supplier</span>
                                                        <span>{claim.supplier.name}</span>
                                                    </>
                                                )}
                                                {claim.tracking_number && (
                                                    <>
                                                        <span className="text-muted-foreground">Tracking #</span>
                                                        <span className="font-mono">{claim.tracking_number}</span>
                                                    </>
                                                )}
                                                {claim.received_serial_number && (
                                                    <>
                                                        <span className="text-muted-foreground">Received Serial</span>
                                                        <span className="font-mono">{claim.received_serial_number}</span>
                                                    </>
                                                )}
                                                {claim.resolution_notes && (
                                                    <>
                                                        <span className="text-muted-foreground">Notes</span>
                                                        <span>{claim.resolution_notes}</span>
                                                    </>
                                                )}
                                                {claim.resolved_at && (
                                                    <>
                                                        <span className="text-muted-foreground">Resolved</span>
                                                        <span>{formatDate(claim.resolved_at)}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Defective unit tracking (from-stock replacements) */}
                                        {claim.defective_status && (
                                            <div className={`rounded-md border p-3 space-y-2 text-xs ${
                                                claim.defective_status === 'received'
                                                    ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20'
                                                    : 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20'
                                            }`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold flex items-center gap-1.5">
                                                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                                                        Defective Unit — Supplier Return
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {claim.defective_status === 'pending'  && 'Awaiting Send'}
                                                        {claim.defective_status === 'sent'     && 'Sent to Supplier'}
                                                        {claim.defective_status === 'received' && 'Received — In Inventory'}
                                                    </Badge>
                                                </div>
                                                {claim.defective_supplier && (
                                                    <p className="text-muted-foreground">Supplier: <span className="text-foreground">{claim.defective_supplier.name}</span></p>
                                                )}
                                                {claim.defective_tracking_number && (
                                                    <p className="text-muted-foreground">Tracking: <span className="font-mono text-foreground">{claim.defective_tracking_number}</span></p>
                                                )}
                                                {claim.defective_received_at && (
                                                    <p className="text-muted-foreground">Received: <span className="text-foreground">{formatDate(claim.defective_received_at)}</span></p>
                                                )}
                                                <PermissionGate permission="warranties.send_to_supplier">
                                                    {claim.defective_status === 'pending' && (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs border-orange-400 text-orange-700 hover:bg-orange-50" onClick={() => openSendDefective(claim)}>
                                                            <Truck className="h-3.5 w-3.5 mr-1" />
                                                            Send Defective to Supplier
                                                        </Button>
                                                    )}
                                                    {claim.defective_status === 'sent' && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs border-slate-400 text-slate-700 hover:bg-slate-50" onClick={() => router.get(route('warranty-claims.supplier-sheet', claim.id))}>
                                                                <Printer className="h-3.5 w-3.5 mr-1" />
                                                                Print Supplier Sheet
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-500 text-green-700 hover:bg-green-50" onClick={() => openReceiveDefective(claim)}>
                                                                <PackageCheck className="h-3.5 w-3.5 mr-1" />
                                                                Receive Back — Add to Inventory
                                                            </Button>
                                                        </div>
                                                    )}
                                                </PermissionGate>
                                            </div>
                                        )}

                                        {/* Active claim actions */}
                                        {isActive && (
                                            <div className="flex flex-wrap gap-2 pt-1 border-t">
                                                {claim.status === 'open' && (
                                                    <PermissionGate permission="warranties.check">
                                                        <Button size="sm" onClick={() => openConfirm(claim)}>
                                                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                            Confirm Issue
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => openNoDefect(claim)}>
                                                            <ThumbsUp className="h-4 w-4 mr-1.5" />
                                                            No Defect Found
                                                        </Button>
                                                    </PermissionGate>
                                                )}
                                                {claim.status === 'confirmed' && (
                                                    <PermissionGate permission="warranties.send_to_supplier">
                                                        <Button size="sm" onClick={() => openResolve(claim)}>
                                                            <ShieldCheck className="h-4 w-4 mr-1.5" />
                                                            Resolve — Repair / Replace / Refund
                                                        </Button>
                                                    </PermissionGate>
                                                )}
                                                {claim.status === 'in_repair' && (
                                                    <div className="flex items-center gap-3 w-full flex-wrap">
                                                        {claim.tracking_number && (
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                Tracking: {claim.tracking_number}
                                                            </span>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-slate-400 text-slate-700 hover:bg-slate-50"
                                                            onClick={() => router.get(route('warranty-claims.supplier-sheet', claim.id))}
                                                        >
                                                            <Printer className="h-4 w-4 mr-1.5" />
                                                            Print Supplier Sheet
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                                            onClick={() => router.get(route('warranty-claims.claiming-stub', claim.id))}
                                                        >
                                                            <Printer className="h-4 w-4 mr-1.5" />
                                                            Print Claiming Stub
                                                        </Button>
                                                        <PermissionGate permission="warranties.send_to_supplier">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-green-500 text-green-700 hover:bg-green-50"
                                                                onClick={() => openReceiveBack(claim)}
                                                            >
                                                                <PackageCheck className="h-4 w-4 mr-1.5" />
                                                                Receive Back
                                                            </Button>
                                                        </PermissionGate>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Print stub — outside isActive, always visible for resolved repairs */}
                                        {claim.status === 'resolved' && claim.resolution_type === 'repair' && (
                                            <div className="pt-2 border-t">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                                    onClick={() => router.get(route('warranty-claims.claiming-stub', claim.id))}
                                                >
                                                    <Printer className="h-4 w-4 mr-1.5" />
                                                    Print Claiming Stub
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Replacement Chain ── */}
                {hasChain && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Replacement Chain
                        </h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            {warranty.parent_warranty && (
                                <>
                                    <ChainNode w={warranty.parent_warranty} />
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                </>
                            )}
                            <ChainNode w={warranty} isCurrent />
                            {warranty.child_warranty && (
                                <>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <ChainNode w={warranty.child_warranty} />
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">Click a node to view that warranty.</p>
                    </div>
                )}
            </div>

            {/* ── Record Serial Dialog ── */}
            <Dialog open={serialOpen} onOpenChange={setSerialOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Record Serial & Activate Warranty</DialogTitle></DialogHeader>
                    <form onSubmit={submitSerial} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Product</span>
                                <span>{warranty.product?.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Coverage</span>
                                <span>{warranty.warranty_months} months</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="serial">Serial Number</Label>
                            <Input
                                id="serial"
                                value={serialForm.data.serial_number}
                                onChange={(e) => serialForm.setData('serial_number', e.target.value)}
                                placeholder="Enter serial number"
                                autoFocus
                            />
                            {serialForm.errors.serial_number && <p className="text-sm text-destructive">{serialForm.errors.serial_number}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="serial_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="serial_notes"
                                value={serialForm.data.notes}
                                onChange={(e) => serialForm.setData('notes', e.target.value)}
                                rows={2}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSerialOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={serialForm.processing}>Activate Warranty</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── New Claim Dialog ── */}
            <Dialog open={newClaimOpen} onOpenChange={setNewClaimOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>File a Warranty Claim</DialogTitle></DialogHeader>
                    <form onSubmit={submitNewClaim} className="space-y-4">
                        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Serial</span>
                                <span className="font-mono">{warranty.serial_number ?? '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Expires</span>
                                <span>{warranty.expires_at ? formatDate(warranty.expires_at) : '—'}</span>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="new_issue">Issue Description <span className="text-muted-foreground">(optional — can be added later)</span></Label>
                            <Textarea
                                id="new_issue"
                                value={newClaimForm.data.issue_description}
                                onChange={(e) => newClaimForm.setData('issue_description', e.target.value)}
                                placeholder="e.g. Device not charging, screen flickering, no power…"
                                rows={3}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setNewClaimOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={newClaimForm.processing}>Open Claim</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Confirm Issue Dialog ── */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Confirm Warranty Issue
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitConfirm} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Describe the defect confirmed by the technician. After confirming, you can choose Repair, Replacement, or Refund.
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm_issue">Issue Description <span className="text-destructive">*</span></Label>
                            <Textarea
                                id="confirm_issue"
                                value={confirmForm.data.issue_description}
                                onChange={(e) => confirmForm.setData('issue_description', e.target.value)}
                                placeholder="e.g. Battery confirmed defective — swells when charged…"
                                rows={3}
                                autoFocus
                            />
                            {confirmForm.errors.issue_description && <p className="text-sm text-destructive">{confirmForm.errors.issue_description}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={confirmForm.processing}>
                                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm Issue
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── No Defect Dialog ── */}
            <Dialog open={noDefectOpen} onOpenChange={setNoDefectOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ThumbsUp className="h-5 w-5 text-blue-600" /> No Defect Found
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitNoDefect} className="space-y-4">
                        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                            The item was inspected and no defect was found. It will be returned to the customer. The warranty remains active.
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="no_defect_issue">Issue Reported by Customer <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="no_defect_issue"
                                value={noDefectForm.data.issue_description}
                                onChange={(e) => noDefectForm.setData('issue_description', e.target.value)}
                                placeholder="What did the customer report?"
                                rows={2}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="no_defect_notes">Technician Notes <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="no_defect_notes"
                                value={noDefectForm.data.resolution_notes}
                                onChange={(e) => noDefectForm.setData('resolution_notes', e.target.value)}
                                placeholder="e.g. Unit tested — all functions normal, no fault found…"
                                rows={2}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setNoDefectOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={noDefectForm.processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <ThumbsUp className="h-4 w-4 mr-1.5" /> Return to Customer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Resolve Dialog (Three R's) ── */}
            <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            Resolve Warranty Claim
                            <Badge variant="outline" className="text-xs font-normal">RA 7394</Badge>
                        </DialogTitle>
                    </DialogHeader>
                    {activeClaim$ && (
                        <form onSubmit={submitResolve} className="space-y-4">
                            {activeClaim$.issue_description && (
                                <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                    <p className="text-xs text-muted-foreground mb-0.5">Confirmed Issue</p>
                                    <p>{activeClaim$.issue_description}</p>
                                </div>
                            )}

                            <div>
                                <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Resolution Type</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { type: 'repair',       icon: Wrench,    label: 'Repair',       desc: 'Send to supplier/ASC for repair' },
                                        { type: 'replacement',  icon: RefreshCw, label: 'Replacement',  desc: 'Replace with new unit from inventory' },
                                        { type: 'refund',       icon: Banknote,  label: 'Refund',       desc: 'Return full purchase price' },
                                    ] as const).map(({ type, icon: Icon, label, desc }) => (
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

                            {/* Repair fields */}
                            {resolveForm.data.resolution_type === 'repair' && (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label>Supplier / ASC <span className="text-muted-foreground">(optional)</span></Label>
                                        <Select value={resolveForm.data.supplier_id} onValueChange={(v) => resolveForm.setData('supplier_id', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Tracking Number <span className="text-muted-foreground">(optional)</span></Label>
                                        <Input
                                            value={resolveForm.data.tracking_number}
                                            onChange={(e) => resolveForm.setData('tracking_number', e.target.value)}
                                            placeholder="Enter tracking number"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Replacement fields */}
                            {resolveForm.data.resolution_type === 'replacement' && (() => {
                                const hasStock = (warranty.product?.stock_quantity ?? 0) > 0;
                                return hasStock ? (
                                    <div className="space-y-3">
                                        <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
                                            <strong>{warranty.product?.stock_quantity} unit{(warranty.product?.stock_quantity ?? 0) !== 1 ? 's' : ''} of {warranty.product?.name} in stock.</strong> 1 unit will be given to the customer immediately. A new warranty will be created.
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>New Unit Serial Number <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                value={resolveForm.data.received_serial_number}
                                                onChange={(e) => resolveForm.setData('received_serial_number', e.target.value)}
                                                placeholder="Serial of the new unit given"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                value={resolveForm.data.resolution_notes}
                                                onChange={(e) => resolveForm.setData('resolution_notes', e.target.value)}
                                                placeholder="e.g. New unit given on the spot"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-amber-200">
                                            <p className="font-semibold mb-1">No stock available — will be sent to supplier for replacement.</p>
                                            <p>A claiming stub will be printed for the customer. They present it when the replacement unit arrives.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Supplier / ASC <span className="text-muted-foreground">(optional)</span></Label>
                                            <Select value={resolveForm.data.supplier_id} onValueChange={(v) => resolveForm.setData('supplier_id', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Tracking Number <span className="text-muted-foreground">(optional)</span></Label>
                                            <Input
                                                value={resolveForm.data.tracking_number}
                                                onChange={(e) => resolveForm.setData('tracking_number', e.target.value)}
                                                placeholder="Enter tracking number"
                                            />
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Refund note */}
                            {resolveForm.data.resolution_type === 'refund' && (
                                <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                    The customer receives a full refund (RA 7394, Art. 68). The warranty will be voided. This action is final.
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={resolveForm.processing || !resolveForm.data.resolution_type}>
                                    {resolveForm.data.resolution_type === 'refund'      && <><Banknote  className="h-4 w-4 mr-1.5" />Issue Refund</>}
                                    {resolveForm.data.resolution_type === 'repair'      && <><Truck     className="h-4 w-4 mr-1.5" />Send for Repair</>}
                                    {resolveForm.data.resolution_type === 'replacement' && <><RefreshCw className="h-4 w-4 mr-1.5" />Replace from Inventory</>}
                                    {!resolveForm.data.resolution_type && 'Select a Resolution'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Receive Back Dialog ── */}
            <Dialog open={receiveBackOpen} onOpenChange={setReceiveBackOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackageCheck className="h-5 w-5" />
                            Receive Back from Supplier
                        </DialogTitle>
                    </DialogHeader>
                    {activeClaim$ && (
                        <form onSubmit={submitReceiveBack} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                                {activeClaim$.supplier && <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span>{activeClaim$.supplier.name}</span></div>}
                                {activeClaim$.tracking_number && <div className="flex justify-between"><span className="text-muted-foreground">Tracking</span><span className="font-mono">{activeClaim$.tracking_number}</span></div>}
                            </div>

                            {activeClaim$.resolution_type === 'replacement' ? (
                                <p className="text-sm text-muted-foreground">
                                    The supplier sent a <strong>replacement unit</strong>. The old warranty will be closed and a new active warranty will be created for this unit.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    The <strong>repaired item</strong> is being received back. The warranty remains active.
                                </p>
                            )}

                            <div className="space-y-1.5">
                                <Label>{activeClaim$.resolution_type === 'replacement' ? 'Replacement' : ''} Serial Number <span className="text-muted-foreground">(optional)</span></Label>
                                <Input
                                    value={receiveBackForm.data.received_serial_number}
                                    onChange={(e) => receiveBackForm.setData('received_serial_number', e.target.value)}
                                    placeholder="Serial number"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                                <Textarea
                                    value={receiveBackForm.data.resolution_notes}
                                    onChange={(e) => receiveBackForm.setData('resolution_notes', e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setReceiveBackOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={receiveBackForm.processing} className="bg-green-600 hover:bg-green-700 text-white">
                                    <PackageCheck className="h-4 w-4 mr-1.5" />
                                    {activeClaim$.resolution_type === 'replacement' ? 'Receive & Create New Warranty' : 'Confirm Received'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            {/* ── Send Defective to Supplier Dialog ── */}
            <Dialog open={sendDefectiveOpen} onOpenChange={setSendDefectiveOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Send Defective Unit to Supplier
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitSendDefective} className="space-y-4">
                        <div className="rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-700">
                            This is the defective unit returned by the customer after a from-stock replacement.
                            Send it to a supplier for repair or replacement. When returned, it will be added to inventory.
                        </div>
                        <div className="space-y-1.5">
                            <Label>Supplier / ASC <span className="text-muted-foreground">(optional)</span></Label>
                            <Select value={sendDefectiveForm.data.supplier_id} onValueChange={(v) => sendDefectiveForm.setData('supplier_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Select supplier…" /></SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tracking Number <span className="text-muted-foreground">(optional)</span></Label>
                            <Input
                                value={sendDefectiveForm.data.defective_tracking_number}
                                onChange={(e) => sendDefectiveForm.setData('defective_tracking_number', e.target.value)}
                                placeholder="Enter tracking number"
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSendDefectiveOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={sendDefectiveForm.processing}>
                                <Truck className="h-4 w-4 mr-1.5" /> Send to Supplier
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Receive Defective Back Dialog ── */}
            <Dialog open={receiveDefectiveOpen} onOpenChange={setReceiveDefectiveOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackageCheck className="h-5 w-5 text-green-600" />
                            Receive Defective Unit Back
                        </DialogTitle>
                    </DialogHeader>
                    {activeClaim$ && (
                        <form onSubmit={submitReceiveDefective} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                                {activeClaim$.defective_supplier && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Supplier</span>
                                        <span>{activeClaim$.defective_supplier.name}</span>
                                    </div>
                                )}
                                {activeClaim$.defective_tracking_number && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tracking</span>
                                        <span className="font-mono">{activeClaim$.defective_tracking_number}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                The supplier has returned this unit (repaired or replaced).
                                <strong> 1 unit of {warranty.product?.name} will be added to inventory.</strong>
                            </p>
                            <div className="space-y-1.5">
                                <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                                <Textarea
                                    value={receiveDefectiveForm.data.resolution_notes}
                                    onChange={(e) => receiveDefectiveForm.setData('resolution_notes', e.target.value)}
                                    placeholder="e.g. Unit repaired — replaced mainboard…"
                                    rows={2}
                                    autoFocus
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setReceiveDefectiveOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={receiveDefectiveForm.processing} className="bg-green-600 hover:bg-green-700 text-white">
                                    <PackageCheck className="h-4 w-4 mr-1.5" /> Receive & Add to Inventory
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
