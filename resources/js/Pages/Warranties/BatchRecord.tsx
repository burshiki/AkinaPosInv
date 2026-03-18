import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Checkbox } from '@/Components/ui/checkbox';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { ArrowLeft, ClipboardList, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { Warranty, Product, WarrantyBatchRow } from '@/types';

interface Props {
    warranties:    (Warranty & { product: Product })[];
    receipts:      string[];
    receiptFilter: string | null;
}

export default function BatchRecord({ warranties, receipts, receiptFilter }: Props) {
    const [rows, setRows] = useState<WarrantyBatchRow[]>(
        warranties.map((w) => ({
            warranty_id:   w.id,
            serial_number: '',
            notes:         '',
            selected:      false,
        }))
    );
    const [errors, setErrors]       = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    /* ── Derived state ── */
    const filledCount   = rows.filter((r) => r.serial_number.trim() !== '').length;
    const selectedCount = rows.filter((r) => r.selected).length;
    const totalCount    = rows.length;
    const allSelected   = totalCount > 0 && rows.every((r) => r.selected);
    const someSelected  = rows.some((r) => r.selected) && !allSelected;

    /* ── Helpers ── */
    function updateRow(idx: number, field: keyof WarrantyBatchRow, value: string | boolean) {
        setRows((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            // Auto-check when serial is typed
            if (field === 'serial_number' && typeof value === 'string' && value.trim() !== '') {
                updated[idx].selected = true;
            }
            return updated;
        });
    }

    function toggleSelectAll() {
        setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
    }

    function handleReceiptFilter(value: string) {
        router.get(
            route('warranties.batch-record'),
            value !== 'all' ? { receipt: value } : {},
            { preserveState: false },
        );
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const toSubmit = rows.filter((r) => r.selected);
        if (toSubmit.length === 0) return;
        setProcessing(true);
        setErrors({});
        router.post(
            route('warranties.batch-record.store'),
            { serials: toSubmit as any },
            {
                onError:   (errs) => { setErrors(errs as Record<string, string>); setProcessing(false); },
                onSuccess: ()     => setProcessing(false),
            },
        );
    }

    const progressPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Batch Serial Recording" />

            <div className="space-y-6 p-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={route('warranties.index')}>
                                <ArrowLeft className="h-4 w-4 mr-1" /> Warranties
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <ClipboardList className="h-5 w-5" />
                                Batch Serial Recording
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Enter serial numbers for pending warranties. Checked rows will be activated on submit.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedCount === 0 || processing}
                        className="shrink-0"
                    >
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        Activate {selectedCount > 0 ? selectedCount : ''} Warrant{selectedCount === 1 ? 'y' : 'ies'}
                    </Button>
                </div>

                {/* Progress + filter row */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Receipt filter */}
                    <Select value={receiptFilter ?? 'all'} onValueChange={handleReceiptFilter}>
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="All receipts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All receipts</SelectItem>
                            {receipts.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Progress indicator */}
                    {totalCount > 0 && (
                        <div className="flex-1 min-w-48 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{filledCount} of {totalCount} serials filled</span>
                                <span>{selectedCount} selected for activation</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${filledCount === totalCount ? 'bg-green-500' : 'bg-amber-400'}`}
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Global errors */}
                {errors.serials && (
                    <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errors.serials}
                    </div>
                )}

                {/* Table */}
                {totalCount === 0 ? (
                    <div className="rounded-md border">
                        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                            {receiptFilter
                                ? `No pending warranties for receipt ${receiptFilter}.`
                                : 'No warranties pending serial recording.'}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <ScrollArea>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={allSelected}
                                                ref={(el) => {
                                                    if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSelected;
                                                }}
                                                onCheckedChange={toggleSelectAll}
                                                aria-label="Select all"
                                            />
                                        </TableHead>
                                        <TableHead>Receipt #</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Coverage</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="min-w-[200px]">Serial Number</TableHead>
                                        <TableHead className="min-w-[160px]">Notes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warranties.map((w, idx) => {
                                        const row = rows[idx];
                                        const rowError = errors[`serials.${idx}.serial_number`];
                                        return (
                                            <TableRow
                                                key={w.id}
                                                className={row?.selected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={row?.selected ?? false}
                                                        onCheckedChange={(v) => updateRow(idx, 'selected', !!v)}
                                                        aria-label={`Select warranty ${w.id}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{w.receipt_number}</TableCell>
                                                <TableCell>{w.product?.name ?? `#${w.product_id}`}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{w.warranty_months} mo.</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {w.customer_name ?? '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={row?.serial_number ?? ''}
                                                        onChange={(e) => updateRow(idx, 'serial_number', e.target.value)}
                                                        placeholder="Scan or type serial…"
                                                        className={`font-mono h-8 text-sm ${rowError ? 'border-destructive' : ''}`}
                                                    />
                                                    {rowError && (
                                                        <p className="text-xs text-destructive mt-0.5">{rowError}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={row?.notes ?? ''}
                                                        onChange={(e) => updateRow(idx, 'notes', e.target.value)}
                                                        placeholder="Optional notes"
                                                        className="h-8 text-sm"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                )}

                {/* Bottom submit */}
                {totalCount > 0 && (
                    <div className="flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={selectedCount === 0 || processing}
                        >
                            <ShieldCheck className="h-4 w-4 mr-1.5" />
                            Activate {selectedCount > 0 ? selectedCount : ''} Warrant{selectedCount === 1 ? 'y' : 'ies'}
                        </Button>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
