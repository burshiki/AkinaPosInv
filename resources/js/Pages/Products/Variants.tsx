import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Plus, Trash2, Tag, Pencil } from 'lucide-react';
import { useState, FormEvent } from 'react';
import type { Product, ProductAttribute, ProductVariant } from '@/types';

interface Props {
    product: Product;
    attributes: ProductAttribute[];
}

export default function ProductVariants({ product, attributes }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [showAttr, setShowAttr] = useState(false);
    const [editVariant, setEditVariant] = useState<ProductVariant | null>(null);
    const [processing, setProcessing] = useState(false);

    // Create variant form
    const [form, setForm] = useState({
        sku: '',
        barcode: '',
        cost_price: '',
        selling_price: '',
        stock_quantity: '0',
        attribute_value_ids: [] as number[],
    });

    // Edit variant form
    const [editForm, setEditForm] = useState({
        sku: '',
        cost_price: '',
        selling_price: '',
        stock_quantity: '0',
        is_active: true,
    });

    // Attribute management
    const [newAttrName, setNewAttrName] = useState('');
    const [newValueFor, setNewValueFor] = useState<number | null>(null);
    const [newValue, setNewValue] = useState('');

    function toggleAttributeValue(id: number) {
        setForm((prev) => ({
            ...prev,
            attribute_value_ids: prev.attribute_value_ids.includes(id)
                ? prev.attribute_value_ids.filter((v) => v !== id)
                : [...prev.attribute_value_ids, id],
        }));
    }

    function handleCreate(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.post(route('products.variants.store', product.id), {
            sku: form.sku || null,
            barcode: form.barcode || null,
            cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
            selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
            stock_quantity: parseInt(form.stock_quantity) || 0,
            attribute_value_ids: form.attribute_value_ids,
        }, {
            onSuccess: () => { setShowCreate(false); resetForm(); },
            onFinish: () => setProcessing(false),
        });
    }

    function openEdit(variant: ProductVariant) {
        setEditVariant(variant);
        setEditForm({
            sku: variant.sku ?? '',
            cost_price: String(variant.cost_price),
            selling_price: String(variant.selling_price),
            stock_quantity: String(variant.stock_quantity),
            is_active: variant.is_active,
        });
    }

    function handleUpdate(e: FormEvent) {
        e.preventDefault();
        if (!editVariant) return;
        setProcessing(true);
        router.put(route('variants.update', editVariant.id), {
            sku: editForm.sku || null,
            cost_price: parseFloat(editForm.cost_price) || 0,
            selling_price: parseFloat(editForm.selling_price) || 0,
            stock_quantity: parseInt(editForm.stock_quantity) || 0,
            is_active: editForm.is_active,
        }, {
            onSuccess: () => setEditVariant(null),
            onFinish: () => setProcessing(false),
        });
    }

    function deleteVariant(variant: ProductVariant) {
        if (!confirm('Delete this variant?')) return;
        router.delete(route('variants.destroy', variant.id));
    }

    function createAttribute(e: FormEvent) {
        e.preventDefault();
        if (!newAttrName.trim()) return;
        router.post(route('attributes.store'), { name: newAttrName.trim() }, {
            onSuccess: () => setNewAttrName(''),
        });
    }

    function addAttributeValue(attrId: number) {
        if (!newValue.trim()) return;
        router.post(route('attributes.values.store', attrId), { value: newValue.trim() }, {
            onSuccess: () => { setNewValue(''); setNewValueFor(null); },
        });
    }

    function resetForm() {
        setForm({ sku: '', barcode: '', cost_price: '', selling_price: '', stock_quantity: '0', attribute_value_ids: [] });
    }

    const variants = product.variants ?? [];

    return (
        <AuthenticatedLayout header={`Variants — ${product.name}`}>
            <Head title={`Variants — ${product.name}`} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('products.show', product.id)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Product
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowAttr(true)}>
                            <Tag className="mr-2 h-4 w-4" /> Manage Attributes
                        </Button>
                        <Button onClick={() => setShowCreate(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Variant
                        </Button>
                    </div>
                </div>

                {/* Product Info */}
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">SKU: {product.sku} | Base: {formatCurrency(product.selling_price)}</p>
                        </div>
                        <Badge>{variants.length} variant{variants.length !== 1 ? 's' : ''}</Badge>
                    </CardContent>
                </Card>

                {/* Variants Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Variants</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attributes</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {variants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No variants yet. Click "Add Variant" to create one.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    variants.map((variant) => (
                                        <TableRow key={variant.id}>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {variant.attribute_values?.map((av) => (
                                                        <Badge key={av.id} variant="outline" className="text-xs">
                                                            {av.attribute?.name}: {av.value}
                                                        </Badge>
                                                    )) ?? <span className="text-muted-foreground text-sm">—</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">{variant.sku ?? '—'}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(variant.cost_price)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(variant.selling_price)}</TableCell>
                                            <TableCell className="text-right">{variant.stock_quantity}</TableCell>
                                            <TableCell>
                                                <Badge variant={variant.is_active ? 'default' : 'secondary'} className="text-xs">
                                                    {variant.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(variant)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteVariant(variant)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create Variant Dialog */}
            <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Variant</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder={`${product.sku}-VAR`} />
                            </div>
                            <div className="space-y-2">
                                <Label>Barcode</Label>
                                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cost Price</Label>
                                <Input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder={String(product.cost_price)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price</Label>
                                <Input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder={String(product.selling_price)} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Stock Quantity *</Label>
                            <Input type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} required />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <Label>Attributes *</Label>
                            {attributes.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No attributes defined. Use "Manage Attributes" to create some first.</p>
                            ) : (
                                attributes.map((attr) => (
                                    <div key={attr.id} className="space-y-1.5">
                                        <p className="text-sm font-medium">{attr.name}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {attr.values?.map((val) => (
                                                <button
                                                    key={val.id}
                                                    type="button"
                                                    onClick={() => toggleAttributeValue(val.id)}
                                                    className={`rounded-md border px-2.5 py-1 text-sm transition-colors ${
                                                        form.attribute_value_ids.includes(val.id)
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'hover:bg-accent'
                                                    }`}
                                                >
                                                    {val.value}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={processing || form.attribute_value_ids.length === 0}
                            >
                                {processing ? 'Creating...' : 'Create Variant'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Variant Dialog */}
            <Dialog open={!!editVariant} onOpenChange={(open) => { if (!open) setEditVariant(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Edit Variant</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>SKU</Label>
                            <Input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cost Price</Label>
                                <Input type="number" min="0" step="0.01" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Selling Price</Label>
                                <Input type="number" min="0" step="0.01" value={editForm.selling_price} onChange={(e) => setEditForm({ ...editForm, selling_price: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Stock Quantity</Label>
                            <Input type="number" min="0" value={editForm.stock_quantity} onChange={(e) => setEditForm({ ...editForm, stock_quantity: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="edit-active"
                                checked={editForm.is_active}
                                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                                className="rounded border"
                            />
                            <Label htmlFor="edit-active">Active</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditVariant(null)}>Cancel</Button>
                            <Button type="submit" disabled={processing}>{processing ? 'Saving...' : 'Save'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Manage Attributes Dialog */}
            <Dialog open={showAttr} onOpenChange={(open) => { if (!open) setShowAttr(false); }}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage Attributes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Create new attribute */}
                        <form onSubmit={createAttribute} className="flex gap-2">
                            <Input placeholder="New attribute (e.g. Color, Size)" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} />
                            <Button type="submit" size="sm" disabled={!newAttrName.trim()}>Add</Button>
                        </form>

                        <Separator />

                        {/* Existing attributes */}
                        {attributes.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No attributes yet.</p>
                        ) : (
                            attributes.map((attr) => (
                                <div key={attr.id} className="space-y-2">
                                    <p className="font-medium text-sm">{attr.name}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {attr.values?.map((val) => (
                                            <Badge key={val.id} variant="outline">{val.value}</Badge>
                                        ))}
                                    </div>
                                    {newValueFor === attr.id ? (
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="New value"
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAttributeValue(attr.id); } }}
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={() => addAttributeValue(attr.id)} disabled={!newValue.trim()}>Add</Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setNewValueFor(null); setNewValue(''); }}>Cancel</Button>
                                        </div>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={() => setNewValueFor(attr.id)}>
                                            <Plus className="mr-1 h-3 w-3" /> Add Value
                                        </Button>
                                    )}
                                    <Separator />
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
