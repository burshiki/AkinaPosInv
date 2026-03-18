import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    Wrench, ArrowLeft, Play, CheckCheck, ShoppingCart, Printer, Trash2,
    Plus, Clock, User, Phone, FileText, DollarSign, Link as LinkIcon
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { RepairJob, RepairJobComponent, Product, PageProps } from '@/types';

const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' }> = {
    pending:     { label: 'Pending',     variant: 'outline' },
    in_progress: { label: 'In Progress', variant: 'default' },
    done:        { label: 'Done',        variant: 'secondary' },
    claimed:     { label: 'Claimed',     variant: 'success' },
};

interface Props {
    repair: RepairJob & { components: RepairJobComponent[]; technician: { name: string } | null };
    products: Pick<Product, 'id' | 'name' | 'sku' | 'selling_price' | 'stock_quantity'>[];
}

function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function RepairsShow({ repair, products }: Props) {
    const { props } = usePage<PageProps>();
    const flash = (props as any).flash as { success?: string; error?: string } | undefined;

    // ── Live timer ──────────────────────────────────────────────────────────
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (repair.status !== 'in_progress' || !repair.started_at) return;
        const startMs = new Date(repair.started_at).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [repair.status, repair.started_at]);

    // Duration for done/claimed
    const durationSeconds = (() => {
        if (!repair.started_at) return null;
        const end = repair.completed_at ? new Date(repair.completed_at) : new Date();
        return Math.floor((end.getTime() - new Date(repair.started_at).getTime()) / 1000);
    })();

    // ── Component form ───────────────────────────────────────────────────────
    const [compSearch, setCompSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Props['products'][0] | null>(null);
    const [compQty, setCompQty] = useState('1');
    const [compPrice, setCompPrice] = useState('');
    const [addingComp, setAddingComp] = useState(false);
    const [showCompDropdown, setShowCompDropdown] = useState(false);

    const filteredProducts = products.filter((p) => {
        if (!compSearch.trim()) return true;
        const term = compSearch.toLowerCase();
        return p.name.toLowerCase().includes(term) || (p.sku ?? '').toLowerCase().includes(term);
    });

    const selectProduct = (p: Props['products'][0]) => {
        setSelectedProduct(p);
        setCompSearch(p.name);
        setCompPrice(String(p.selling_price));
        setShowCompDropdown(false);
    };

    const handleAddComponent = () => {
        if (!selectedProduct || !compQty || !compPrice) return;
        setAddingComp(true);
        router.post(
            route('repairs.add-component', repair.id),
            { product_id: selectedProduct.id, quantity: parseInt(compQty, 10), unit_price: parseFloat(compPrice) },
            {
                onSuccess: () => {
                    setSelectedProduct(null);
                    setCompSearch('');
                    setCompQty('1');
                    setCompPrice('');
                },
                onFinish: () => setAddingComp(false),
            }
        );
    };

    const handleRemoveComponent = (component: RepairJobComponent) => {
        router.delete(route('repairs.remove-component', { repair: repair.id, component: component.id }));
    };

    // ── Repair fee ───────────────────────────────────────────────────────────
    const [repairFee, setRepairFee] = useState(String(repair.repair_fee ?? ''));
    const [savingFee, setSavingFee] = useState(false);

    const handleSaveFee = () => {
        setSavingFee(true);
        router.post(
            route('repairs.update-fee', repair.id),
            { repair_fee: repairFee || null },
            { onFinish: () => setSavingFee(false) }
        );
    };

    const componentsTotal = repair.components.reduce((s, c) => s + c.subtotal, 0);
    const canModify = ['pending', 'in_progress', 'done'].includes(repair.status);

    const cfg = STATUS_CFG[repair.status] ?? { label: repair.status, variant: 'outline' as const };

    return (
        <AuthenticatedLayout>
            <Head title={`Repair ${repair.job_number}`} />
            <div className="mx-auto max-w-4xl space-y-6 p-6">

                {/* Flash */}
                {flash?.success && (
                    <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                        {flash.error}
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.get(route('repairs.index'))}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold font-mono">{repair.job_number}</h1>
                                <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Accepted: {formatDate(repair.accepted_at)}
                                {repair.technician && ` · Technician: ${repair.technician.name}`}
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(route('repairs.stub', repair.id), '_blank')}
                        >
                            <Printer className="mr-1.5 h-4 w-4" /> Print Stub
                        </Button>

                        <PermissionGate permission="repairs.manage">
                            {repair.status === 'pending' && (
                                <Button
                                    size="sm"
                                    onClick={() => router.post(route('repairs.start', repair.id))}
                                >
                                    <Play className="mr-1.5 h-4 w-4" /> Start Repair
                                </Button>
                            )}
                            {repair.status === 'in_progress' && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => router.post(route('repairs.complete', repair.id))}
                                >
                                    <CheckCheck className="mr-1.5 h-4 w-4" /> Mark as Done
                                </Button>
                            )}
                        </PermissionGate>

                        {repair.sale_id && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get(route('sales.show', repair.sale_id!))}
                            >
                                <LinkIcon className="mr-1.5 h-4 w-4" /> View Sale
                            </Button>
                        )}
                    </div>
                </div>

                {/* Done — waiting for cashier notice */}
                {repair.status === 'done' && (
                    <div className="flex items-center gap-3 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-200">
                        <ShoppingCart className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-semibold">Ready for payment</p>
                            <p className="text-xs mt-0.5 opacity-80">Please inform the cashier to process the payment. The cashier can find this job in the Repairs list.</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Customer & Problem */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-1.5">
                                <User className="h-4 w-4" /> Customer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p className="font-medium">{repair.customer_name}</p>
                            {repair.customer_phone && (
                                <p className="flex items-center gap-1.5 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5" /> {repair.customer_phone}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timer */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-1.5">
                                <Clock className="h-4 w-4" /> Duration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {repair.status === 'pending' && (
                                <p className="text-sm text-muted-foreground">Not started yet.</p>
                            )}
                            {repair.status === 'in_progress' && (
                                <div className="font-mono text-3xl font-bold tabular-nums text-blue-600">
                                    {formatElapsed(elapsed)}
                                </div>
                            )}
                            {['done', 'claimed'].includes(repair.status) && durationSeconds !== null && (
                                <div>
                                    <div className="font-mono text-2xl font-bold tabular-nums">{formatElapsed(durationSeconds)}</div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {repair.started_at && `Started: ${formatDate(repair.started_at)}`}
                                        {repair.completed_at && ` · Completed: ${formatDate(repair.completed_at)}`}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Problem Description */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                            <FileText className="h-4 w-4" /> Problem Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{repair.problem_description}</p>
                    </CardContent>
                </Card>

                {/* Replaced Components */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Replaced Components / Parts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Part</TableHead>
                                    <TableHead className="w-20 text-right">Qty</TableHead>
                                    <TableHead className="w-28 text-right">Unit Price</TableHead>
                                    <TableHead className="w-28 text-right">Subtotal</TableHead>
                                    <PermissionGate permission="repairs.manage">
                                        {canModify && <TableHead className="w-10" />}
                                    </PermissionGate>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {repair.components.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                            No components recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    repair.components.map((comp) => (
                                        <TableRow key={comp.id}>
                                            <TableCell>
                                                <div className="font-medium text-sm">{comp.product_name}</div>
                                                {comp.product_sku && (
                                                    <div className="text-xs text-muted-foreground font-mono">{comp.product_sku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{comp.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(comp.unit_price)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(comp.subtotal)}</TableCell>
                                            <PermissionGate permission="repairs.manage">
                                                {canModify && (
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive"
                                                            onClick={() => handleRemoveComponent(comp)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </PermissionGate>
                                        </TableRow>
                                    ))
                                )}
                                {repair.components.length > 0 && (
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={3} className="text-right text-sm font-semibold">Parts Total:</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(componentsTotal)}</TableCell>
                                        <PermissionGate permission="repairs.manage">
                                            {canModify && <TableCell />}
                                        </PermissionGate>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Add component form */}
                        <PermissionGate permission="repairs.manage">
                            {canModify && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Replaced Part</p>
                                        <div className="flex flex-wrap gap-2">
                                            {/* Product search */}
                                            <div className="relative flex-1 min-w-48">
                                                <Input
                                                    placeholder="Search product…"
                                                    value={compSearch}
                                                    onChange={(e) => { setCompSearch(e.target.value); setShowCompDropdown(true); setSelectedProduct(null); }}
                                                    onFocus={() => setShowCompDropdown(true)}
                                                />
                                                {showCompDropdown && compSearch.trim() && !selectedProduct && (
                                                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                                                        {filteredProducts.length === 0 ? (
                                                            <p className="px-3 py-2 text-sm text-muted-foreground">No products found.</p>
                                                        ) : (
                                                            filteredProducts.slice(0, 8).map((p) => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                                                                    onClick={() => selectProduct(p)}
                                                                >
                                                                    <div>
                                                                        <p className="font-medium">{p.name}</p>
                                                                        {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                                                                    </div>
                                                                    <span className="ml-2 text-sm font-semibold shrink-0">{formatCurrency(p.selling_price)}</span>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Qty */}
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="Qty"
                                                value={compQty}
                                                onChange={(e) => setCompQty(e.target.value)}
                                                className="w-20"
                                            />
                                            {/* Price */}
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                placeholder="Unit price"
                                                value={compPrice}
                                                onChange={(e) => setCompPrice(e.target.value)}
                                                className="w-32"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleAddComponent}
                                                disabled={addingComp || !selectedProduct || !compQty || !compPrice}
                                            >
                                                <Plus className="mr-1.5 h-4 w-4" /> Add
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </PermissionGate>
                    </CardContent>
                </Card>

                {/* Repair Fee */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                            <DollarSign className="h-4 w-4" /> Repair Service Fee
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {canModify ? (
                            <PermissionGate
                                permission="repairs.manage"
                                fallback={
                                    <p className="text-sm font-medium">
                                        {repair.repair_fee != null ? formatCurrency(repair.repair_fee) : <span className="text-muted-foreground">Not set</span>}
                                    </p>
                                }
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
                                        <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={repairFee}
                                            onChange={(e) => setRepairFee(e.target.value)}
                                            className="pl-7 w-40"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSaveFee}
                                        disabled={savingFee}
                                    >
                                        {savingFee ? 'Saving…' : 'Save'}
                                    </Button>
                                </div>
                            </PermissionGate>
                        ) : (
                            <p className="text-sm font-medium">
                                {repair.repair_fee != null ? formatCurrency(repair.repair_fee) : <span className="text-muted-foreground">Not set</span>}
                            </p>
                        )}
                        {repair.components.length > 0 && repair.repair_fee != null && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Total estimate: {formatCurrency(componentsTotal + (repair.repair_fee ?? 0))} (parts + fee)
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
