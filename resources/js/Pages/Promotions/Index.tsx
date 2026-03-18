import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { useConfirm } from '@/Components/app/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, Percent, DollarSign, Gift } from 'lucide-react';
import { useState, FormEvent } from 'react';
import type { Promotion, PaginatedData } from '@/types';

interface Props {
    promotions: PaginatedData<Promotion>;
    filters: { status?: string };
}

const typeIcons = {
    percentage: Percent,
    fixed_amount: DollarSign,
    buy_x_get_y: Gift,
};

const typeLabels = {
    percentage: 'Percentage Off',
    fixed_amount: 'Fixed Amount Off',
    buy_x_get_y: 'Buy X Get Y',
};

export default function PromotionsIndex({ promotions, filters }: Props) {
    const confirm = useConfirm();
    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [editTarget, setEditTarget] = useState<Promotion | null>(null);
    const [processing, setProcessing] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        type: 'percentage' as 'percentage' | 'fixed_amount' | 'buy_x_get_y',
        value: '',
        buy_quantity: '',
        get_quantity: '',
        min_purchase: '',
        starts_at: '',
        ends_at: '',
        applies_to: 'all' as 'all' | 'product' | 'category',
        customer_tier: '',
        usage_limit: '',
    });

    function filterByStatus(status: string) {
        router.get(route('promotions.index'), { status: status || undefined }, { preserveState: true });
    }

    function openCreate() {
        resetForm();
        setEditTarget(null);
        setDialogMode('create');
    }

    function openEdit(promo: Promotion) {
        setForm({
            name: promo.name,
            description: promo.description ?? '',
            type: promo.type as 'percentage' | 'fixed_amount' | 'buy_x_get_y',
            value: String(promo.value),
            buy_quantity: promo.buy_quantity != null ? String(promo.buy_quantity) : '',
            get_quantity: promo.get_quantity != null ? String(promo.get_quantity) : '',
            min_purchase: promo.min_purchase != null ? String(promo.min_purchase) : '',
            starts_at: promo.starts_at ? String(promo.starts_at).split('T')[0] : '',
            ends_at: promo.ends_at ? String(promo.ends_at).split('T')[0] : '',
            applies_to: promo.applies_to as 'all' | 'product' | 'category',
            customer_tier: promo.customer_tier ?? '',
            usage_limit: promo.usage_limit != null ? String(promo.usage_limit) : '',
        });
        setEditTarget(promo);
        setDialogMode('edit');
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        const payload = {
            ...form,
            value: parseFloat(form.value) || 0,
            buy_quantity: form.buy_quantity ? parseInt(form.buy_quantity) : null,
            get_quantity: form.get_quantity ? parseInt(form.get_quantity) : null,
            min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : null,
            starts_at: form.starts_at || null,
            ends_at: form.ends_at || null,
            customer_tier: form.customer_tier || null,
            usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        };
        if (dialogMode === 'edit' && editTarget) {
            router.put(route('promotions.update', editTarget.id), payload, {
                onSuccess: () => { setDialogMode(null); setEditTarget(null); resetForm(); },
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post(route('promotions.store'), payload, {
                onSuccess: () => { setDialogMode(null); resetForm(); },
                onFinish: () => setProcessing(false),
            });
        }
    }

    function toggleActive(promo: Promotion) {
        router.put(route('promotions.update', promo.id), {
            name: promo.name,
            is_active: !promo.is_active,
            ends_at: promo.ends_at,
        }, { preserveState: true });
    }

    async function deletePromo(promo: Promotion) {
        const ok = await confirm({
            title: 'Delete Promotion',
            description: `Delete promotion "${promo.name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('promotions.destroy', promo.id));
    }

    function resetForm() {
        setForm({ name: '', description: '', type: 'percentage', value: '', buy_quantity: '', get_quantity: '', min_purchase: '', starts_at: '', ends_at: '', applies_to: 'all', customer_tier: '', usage_limit: '' });
    }

    function formatValue(promo: Promotion) {
        if (promo.type === 'percentage') return `${promo.value}%`;
        if (promo.type === 'fixed_amount') return formatCurrency(promo.value);
        return `Buy ${promo.buy_quantity} Get ${promo.get_quantity}`;
    }

    return (
        <AuthenticatedLayout>
            <Head title="Promotions" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Percent className="h-6 w-6" />
                        Promotions
                    </h1>
                    <PermissionGate permission="promotions.manage">
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-1.5" /> New Promotion
                        </Button>
                    </PermissionGate>
                </div>

                {/* Status filter buttons */}
                <div className="flex gap-2">
                    {['', 'active', 'inactive'].map((s) => (
                        <Button
                            key={s}
                            variant={(filters.status ?? '') === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => filterByStatus(s)}
                        >
                            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                    ))}
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Applies To</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {promotions.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            No promotions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    promotions.data.map((promo) => {
                                        const Icon = typeIcons[promo.type];
                                        return (
                                            <TableRow key={promo.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{promo.name}</p>
                                                        {promo.description && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-xs">{promo.description}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="text-sm">{typeLabels[promo.type]}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{formatValue(promo)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize text-xs">{promo.applies_to}</Badge>
                                                    {promo.customer_tier && (
                                                        <Badge variant="outline" className="ml-1 capitalize text-xs">{promo.customer_tier}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {promo.starts_at || promo.ends_at ? (
                                                        <span>
                                                            {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString() : '—'}
                                                            {' → '}
                                                            {promo.ends_at ? new Date(promo.ends_at).toLocaleDateString() : '∞'}
                                                        </span>
                                                    ) : 'Always'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={promo.is_active ? 'success' : 'secondary'}>
                                                        {promo.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <PermissionGate permission="promotions.manage">
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                title="Edit"
                                                                onClick={() => openEdit(promo)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleActive(promo)}
                                                            >
                                                                {promo.is_active ? 'Deactivate' : 'Activate'}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => deletePromo(promo)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </PermissionGate>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>

                <Pagination data={promotions} />
            </div>

            {/* Create Promotion Dialog */}
            <Dialog open={dialogMode !== null} onOpenChange={(open) => { if (!open) { setDialogMode(null); setEditTarget(null); } }}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Percent className="h-5 w-5" />
                            {dialogMode === 'edit' ? `Edit: ${editTarget?.name}` : 'New Promotion'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Type *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage Off</SelectItem>
                                        <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                                        <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{form.type === 'percentage' ? 'Percentage (%)' : form.type === 'fixed_amount' ? 'Amount (₱)' : 'Value'} *</Label>
                                <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required />
                            </div>
                        </div>

                        {form.type === 'buy_x_get_y' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Buy Quantity</Label>
                                    <Input type="number" min="1" value={form.buy_quantity} onChange={(e) => setForm({ ...form, buy_quantity: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Get Quantity</Label>
                                    <Input type="number" min="1" value={form.get_quantity} onChange={(e) => setForm({ ...form, get_quantity: e.target.value })} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Min Purchase Amount</Label>
                            <Input type="number" min="0" step="0.01" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Starts At</Label>
                                <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Ends At</Label>
                                <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Applies To</Label>
                                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as typeof form.applies_to })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Products</SelectItem>
                                        <SelectItem value="product">Specific Products</SelectItem>
                                        <SelectItem value="category">Specific Categories</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Customer Tier</Label>
                                <Select value={form.customer_tier || 'all_tiers'} onValueChange={(v) => setForm({ ...form, customer_tier: v === 'all_tiers' ? '' : v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all_tiers">All Tiers</SelectItem>
                                        <SelectItem value="standard">Standard</SelectItem>
                                        <SelectItem value="silver">Silver</SelectItem>
                                        <SelectItem value="gold">Gold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Usage Limit (leave empty for unlimited)</Label>
                            <Input type="number" min="1" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setDialogMode(null); setEditTarget(null); }}>Cancel</Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : dialogMode === 'edit' ? 'Save Changes' : 'Create Promotion'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
