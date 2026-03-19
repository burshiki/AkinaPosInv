import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { StockBadge } from '@/Components/app/stock-badge';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { Plus, Search, Eye, Pencil, Trash2, Package, Upload } from 'lucide-react';
import BatchUploadModal from './BatchUploadModal';
import { useState, useEffect } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { Product, Category, PaginatedData } from '@/types';

interface Props {
    products: PaginatedData<Product>;
    categories: Category[];
    filters: { search?: string; category_id?: string };
}

export default function ProductsIndex({ products, categories, filters }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [batchUploadOpen, setBatchUploadOpen] = useState(false);

    const form = useForm({
        name: '',
        sku: '',
        barcode: '',
        description: '',
        category_id: '',
        cost_price: '',
        selling_price: '',
        stock_quantity: '0',
        low_stock_threshold: '10',
        is_assembled: false as boolean,
        is_component: false as boolean,
        has_warranty: false as boolean,
        warranty_months: '' as string,
        is_active: true as boolean,
        tax_rate: '' as string,
        is_vat_exempt: false as boolean,
    });

    useEffect(() => {
        router.get(
            route('products.index'),
            { search: debouncedSearch || undefined, category_id: filters.category_id || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleCategoryFilter = (value: string) => {
        router.get(
            route('products.index'),
            { search: search || undefined, category_id: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const openCreate = () => {
        form.setData({ name: '', sku: '', barcode: '', description: '', category_id: '', cost_price: '', selling_price: '', stock_quantity: '0', low_stock_threshold: '10', is_assembled: false, is_component: false, has_warranty: false, warranty_months: '', is_active: true, tax_rate: '', is_vat_exempt: false });
        form.clearErrors();
        setEditingProduct(null);
        setDialogOpen(true);
    };

    const openEdit = (product: Product) => {
        form.setData({
            name: product.name,
            sku: product.sku ?? '',
            barcode: product.barcode ?? '',
            description: product.description ?? '',
            category_id: product.category_id ? String(product.category_id) : '',
            cost_price: String(product.cost_price ?? ''),
            selling_price: String(product.selling_price ?? ''),
            stock_quantity: String(product.stock_quantity ?? 0),
            low_stock_threshold: String(product.low_stock_threshold ?? 10),
            is_assembled: !!product.is_assembled,
            is_component: !!product.is_component,
            has_warranty: !!product.has_warranty,
            warranty_months: product.warranty_months ? String(product.warranty_months) : '',
            is_active: product.is_active !== false,
            tax_rate: product.tax_rate != null ? String(product.tax_rate) : '',
            is_vat_exempt: !!product.is_vat_exempt,
        });
        form.clearErrors();
        setEditingProduct(product);
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            form.put(route('products.update', editingProduct.id), {
                onSuccess: () => { setDialogOpen(false); setEditingProduct(null); },
            });
        } else {
            form.post(route('products.store'), { onSuccess: () => setDialogOpen(false) });
        }
    };

    const handleDelete = async (product: Product) => {
        const ok = await confirm({
            title: 'Delete Product',
            description: `Are you sure you want to delete "${product.name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('products.destroy', product.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Products" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        Products
                    </h1>
                    <div className="flex items-center gap-2">
                        <PermissionGate permission="inventory.create">
                            <Button variant="outline" onClick={() => setBatchUploadOpen(true)}>
                                <Upload className="h-4 w-4 mr-1.5" /> Batch Upload
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission="inventory.create">
                            <Button onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1.5" /> Add Product
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select
                        value={filters.category_id ?? 'all'}
                        onValueChange={handleCategoryFilter}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No products found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.data.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.category?.name ?? '—'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.selling_price)}</TableCell>
                                        <TableCell>
                                            <StockBadge quantity={product.stock_quantity} threshold={product.low_stock_threshold} />
                                        </TableCell>
                                        <TableCell className="space-x-1">
                                            {product.is_assembled && (
                                                <Badge variant="secondary">Assembled</Badge>
                                            )}
                                            {product.is_component && (
                                                <Badge variant="outline">Component</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="View" asChild>
                                                    <Link href={route('products.show', product.id)}><Eye className="h-4 w-4" /></Link>
                                                </Button>
                                                <PermissionGate permission="inventory.edit">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(product)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="inventory.delete">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(product)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>                    </ScrollArea>                </div>

                <Pagination data={products} />
            </div>

            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingProduct(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            {editingProduct ? `Edit: ${editingProduct.name}` : 'New Product'}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <form id="product-form" onSubmit={handleSubmit} className="space-y-4 py-1">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="p_name">Name *</Label>
                                    <Input id="p_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                    {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="p_sku">SKU</Label>
                                    <Input id="p_sku" value={form.data.sku} onChange={(e) => form.setData('sku', e.target.value)} />
                                    {form.errors.sku && <p className="text-sm text-destructive">{form.errors.sku}</p>}
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="p_barcode">Barcode</Label>
                                    <Input id="p_barcode" value={form.data.barcode} onChange={(e) => form.setData('barcode', e.target.value)} />
                                    {form.errors.barcode && <p className="text-sm text-destructive">{form.errors.barcode}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="p_category">Category</Label>
                                    <Select value={form.data.category_id} onValueChange={(v) => form.setData('category_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {form.errors.category_id && <p className="text-sm text-destructive">{form.errors.category_id}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="p_desc">Description</Label>
                                <Textarea id="p_desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={2} />
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="p_cost">
                                        Cost Price {form.data.is_assembled ? <span className="font-normal text-xs text-muted-foreground">(auto-computed from BOM)</span> : '*'}
                                    </Label>
                                    <Input id="p_cost" type="number" step="0.01" min="0" value={form.data.cost_price} onChange={(e) => form.setData('cost_price', e.target.value)} disabled={form.data.is_assembled} className={form.data.is_assembled ? 'bg-muted' : ''} />
                                    {form.errors.cost_price && <p className="text-sm text-destructive">{form.errors.cost_price}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="p_price">Selling Price *</Label>
                                    <Input id="p_price" type="number" step="0.01" min="0" value={form.data.selling_price} onChange={(e) => form.setData('selling_price', e.target.value)} />
                                    {form.errors.selling_price && <p className="text-sm text-destructive">{form.errors.selling_price}</p>}
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="p_stock">Stock Quantity</Label>
                                    <Input id="p_stock" type="number" min="0" value={form.data.stock_quantity} onChange={(e) => form.setData('stock_quantity', e.target.value)} />
                                    {form.errors.stock_quantity && <p className="text-sm text-destructive">{form.errors.stock_quantity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="p_threshold">Low Stock Threshold</Label>
                                    <Input id="p_threshold" type="number" min="0" value={form.data.low_stock_threshold} onChange={(e) => form.setData('low_stock_threshold', e.target.value)} />
                                    {form.errors.low_stock_threshold && <p className="text-sm text-destructive">{form.errors.low_stock_threshold}</p>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="p_assembled" checked={form.data.is_assembled} onCheckedChange={(v) => { form.setData('is_assembled', !!v); if (!!v) { form.setData('is_component', false); form.setData('cost_price', '0'); } }} />
                                    <Label htmlFor="p_assembled">Assembled Product</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="p_component" checked={form.data.is_component} onCheckedChange={(v) => { form.setData('is_component', !!v); if (!!v) form.setData('is_assembled', false); }} />
                                    <Label htmlFor="p_component">Component Part</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="p_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', !!v)} />
                                    <Label htmlFor="p_active">Active</Label>
                                </div>
                            </div>
                            {/* Warranty */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="p_warranty" checked={form.data.has_warranty} onCheckedChange={(v) => { form.setData('has_warranty', !!v); if (!v) form.setData('warranty_months', ''); }} />
                                    <Label htmlFor="p_warranty">Has Warranty</Label>
                                </div>
                                {form.data.has_warranty && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="p_warranty_months"
                                            type="number"
                                            min="1"
                                            max="120"
                                            placeholder="Months"
                                            value={form.data.warranty_months}
                                            onChange={(e) => form.setData('warranty_months', e.target.value)}
                                            className="w-28"
                                        />
                                        <Label htmlFor="p_warranty_months" className="text-muted-foreground">months coverage</Label>
                                        {form.errors.warranty_months && <p className="text-sm text-destructive">{form.errors.warranty_months}</p>}
                                    </div>
                                )}
                            </div>
                            {editingProduct && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p_tax_rate">Tax Rate (%)</Label>
                                        <Input id="p_tax_rate" type="number" step="0.01" min="0" value={form.data.tax_rate} onChange={(e) => form.setData('tax_rate', e.target.value)} />
                                        {form.errors.tax_rate && <p className="text-sm text-destructive">{form.errors.tax_rate}</p>}
                                    </div>
                                    <div className="flex items-end gap-2 pb-0.5">
                                        <Checkbox id="p_vat_exempt" checked={form.data.is_vat_exempt} onCheckedChange={(v) => form.setData('is_vat_exempt', !!v)} />
                                        <Label htmlFor="p_vat_exempt">VAT Exempt</Label>
                                    </div>
                                </div>
                            )}
                            {form.data.is_assembled && (
                                <p className="text-sm text-muted-foreground rounded-md bg-muted px-3 py-2">
                                    Cost will be auto-computed when you define the Bill of Materials in <strong>Assemblies</strong>.
                                </p>
                            )}
                        </form>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="product-form" disabled={form.processing}>
                            {form.processing ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <BatchUploadModal
                open={batchUploadOpen}
                onClose={() => setBatchUploadOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
