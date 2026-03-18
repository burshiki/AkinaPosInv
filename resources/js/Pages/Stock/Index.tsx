import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Textarea } from '@/Components/ui/textarea';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { usePermission } from '@/hooks/use-permissions';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, Boxes, AlertTriangle, ClipboardCheck, PlayCircle, StopCircle, SlidersHorizontal, History, Printer, Wrench } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Category, InventorySession, PaginatedData, PageProps, Product } from '@/types';

interface Props {
    products: PaginatedData<Product & { category?: Category }>;
    categories: { id: number; name: string }[];
    activeSession: InventorySession | null;
    filters: { search?: string; category_id?: string; low_stock?: string };
}

export default function StockIndex({ products, categories, activeSession, filters }: Props) {
    const { inventoryMode } = usePage<PageProps>().props;
    const { can } = usePermission();

    const [search, setSearch]       = useState(filters.search ?? '');
    const [categoryId, setCategoryId] = useState(filters.category_id ?? 'all');
    const [lowStock, setLowStock]   = useState(filters.low_stock === '1');
    const debouncedSearch           = useDebounce(search, 300);

    // Dialogs
    const [adjustOpen, setAdjustOpen]           = useState(false);
    const [internalOpen, setInternalOpen]       = useState(false);
    const [startOpen, setStartOpen]             = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Forms
    const adjustForm   = useForm({ adjustment_type: 'add', quantity: '', reason: '' });
    const internalForm = useForm({ quantity: '', purpose: '' });
    const startForm    = useForm({ notes: '' });

    // Per-row inventory count inputs: productId -> counted_qty string
    const [countInputs, setCountInputs] = useState<Record<number, string>>({});
    const countForm = useForm({ counted_qty: '', reason: 'Inventory count' });

    useEffect(() => {
        router.get(
            route('stock.index'),
            {
                search:      debouncedSearch || undefined,
                category_id: categoryId !== 'all' ? categoryId : undefined,
                low_stock:   lowStock ? '1' : undefined,
            },
            { preserveState: true, replace: true },
        );
    }, [debouncedSearch, categoryId, lowStock]);

    function openAdjust(product: Product) {
        setSelectedProduct(product);
        adjustForm.setData({ adjustment_type: 'add', quantity: '', reason: '' });
        adjustForm.clearErrors();
        setAdjustOpen(true);
    }

    function submitAdjust(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProduct) return;
        adjustForm.post(route('stock.adjust', selectedProduct.id), {
            onSuccess: () => setAdjustOpen(false),
        });
    }

    function openInternal(product: Product) {
        setSelectedProduct(product);
        internalForm.setData({ quantity: '', purpose: '' });
        internalForm.clearErrors();
        setInternalOpen(true);
    }

    function submitInternal(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedProduct) return;
        internalForm.post(route('stock.internal-use', selectedProduct.id), {
            onSuccess: () => setInternalOpen(false),
        });
    }

    function submitStart(e: React.FormEvent) {
        e.preventDefault();
        startForm.post(route('stock.inventory.start'), {
            onSuccess: () => setStartOpen(false),
        });
    }

    function endInventory() {
        router.post(route('stock.inventory.end'));
    }

    function saveCount(product: Product) {
        const val = countInputs[product.id];
        if (val === undefined || val === '') return;
        countForm.setData({ counted_qty: val, reason: 'Inventory count' });
        countForm.post(route('stock.count', product.id), {
            onSuccess: () => {
                setCountInputs(prev => ({ ...prev, [product.id]: '' }));
            },
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Stock" />

            <div className="space-y-6 p-6">
                {/* Inventory mode banner */}
                {inventoryMode && (
                    <div className="flex items-center justify-between rounded-md border border-amber-400 bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Inventory Count In Progress</p>
                                <p className="text-sm">
                                    Sales are blocked. Started by <strong>{activeSession?.starter?.name ?? '—'}</strong> on {activeSession?.started_at ? new Date(activeSession.started_at).toLocaleString() : '—'}
                                </p>
                            </div>
                        </div>
                        <PermissionGate permission="stock.manage_inventory">
                            <Button variant="destructive" size="sm" onClick={endInventory}>
                                <StopCircle className="mr-1.5 h-4 w-4" />
                                End Inventory
                            </Button>
                        </PermissionGate>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="flex items-center gap-2 text-2xl font-bold">
                        <Boxes className="h-6 w-6" />
                        Stock List
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('stock.transactions')}>
                                <History className="mr-1.5 h-4 w-4" />
                                Transactions
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(route('stock.count-sheet'), '_blank')}
                        >
                            <Printer className="mr-1.5 h-4 w-4" />
                            Print Count Sheet
                        </Button>
                        {!inventoryMode && (
                            <PermissionGate permission="stock.manage_inventory">
                                <Button size="sm" variant="outline" onClick={() => setStartOpen(true)}>
                                    <PlayCircle className="mr-1.5 h-4 w-4" />
                                    Start Inventory Count
                                </Button>
                            </PermissionGate>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search product or SKU…"
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant={lowStock ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => setLowStock(!lowStock)}
                        className="gap-1.5"
                    >
                        <AlertTriangle className="h-4 w-4" />
                        Low Stock Only
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Stock Qty</TableHead>
                                <TableHead className="text-right">Low Stock At</TableHead>
                                <TableHead className="text-right">
                                    {inventoryMode ? 'Counted Qty' : 'Actions'}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No products found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.data.map((p) => {
                                    const isLow = p.stock_quantity <= p.low_stock_threshold;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground">
                                                {p.sku ?? '—'}
                                            </TableCell>
                                            <TableCell>{p.category?.name ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <span className={isLow ? 'font-bold text-destructive' : ''}>
                                                    {p.stock_quantity}
                                                </span>
                                                {isLow && (
                                                    <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {p.low_stock_threshold}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {inventoryMode ? (
                                                    <PermissionGate permission="stock.adjust">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                className="w-24 text-right h-8"
                                                                placeholder={String(p.stock_quantity)}
                                                                value={countInputs[p.id] ?? ''}
                                                                onChange={(e) =>
                                                                    setCountInputs(prev => ({
                                                                        ...prev,
                                                                        [p.id]: e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={!countInputs[p.id] || countForm.processing}
                                                                onClick={() => saveCount(p)}
                                                            >
                                                                <ClipboardCheck className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </PermissionGate>
                                                ) : (
                                                    <PermissionGate permission="stock.adjust">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openAdjust(p)}
                                                            >
                                                                <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                                                                Adjust
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-orange-400 text-orange-700 hover:bg-orange-50"
                                                                onClick={() => openInternal(p)}
                                                            >
                                                                <Wrench className="mr-1.5 h-4 w-4" />
                                                                Internal Use
                                                            </Button>
                                                        </div>
                                                    </PermissionGate>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination data={products} />
            </div>

            {/* Adjust Stock Dialog */}
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5" />
                            Adjust Stock
                        </DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <form onSubmit={submitAdjust} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product</span>
                                    <span className="font-medium">{selectedProduct.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Stock</span>
                                    <span className="font-bold">{selectedProduct.stock_quantity}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Adjustment Type</Label>
                                <Select
                                    value={adjustForm.data.adjustment_type}
                                    onValueChange={(v) => adjustForm.setData('adjustment_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="add">Add to stock</SelectItem>
                                        <SelectItem value="subtract">Subtract from stock</SelectItem>
                                        <SelectItem value="set">Set exact quantity</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="adj_qty">
                                    {adjustForm.data.adjustment_type === 'set' ? 'New Quantity' : 'Quantity'}
                                </Label>
                                <Input
                                    id="adj_qty"
                                    type="number"
                                    min="0"
                                    value={adjustForm.data.quantity}
                                    onChange={(e) => adjustForm.setData('quantity', e.target.value)}
                                    autoFocus
                                />
                                {adjustForm.errors.quantity && (
                                    <p className="text-sm text-destructive">{adjustForm.errors.quantity}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="adj_reason">
                                    Reason <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="adj_reason"
                                    rows={2}
                                    value={adjustForm.data.reason}
                                    onChange={(e) => adjustForm.setData('reason', e.target.value)}
                                    placeholder="Damaged goods, received shipment, correction…"
                                />
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={adjustForm.processing}>
                                    Save Adjustment
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Internal Use Dialog */}
            <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wrench className="h-5 w-5" />
                            Internal Use
                        </DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <form onSubmit={submitInternal} className="space-y-4">
                            <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product</span>
                                    <span className="font-medium">{selectedProduct.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Stock</span>
                                    <span className="font-bold">{selectedProduct.stock_quantity}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="int_qty">Quantity Used</Label>
                                <Input
                                    id="int_qty"
                                    type="number"
                                    min="1"
                                    value={internalForm.data.quantity}
                                    onChange={(e) => internalForm.setData('quantity', e.target.value)}
                                    autoFocus
                                />
                                {internalForm.errors.quantity && (
                                    <p className="text-sm text-destructive">{internalForm.errors.quantity}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="int_purpose">
                                    Purpose <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="int_purpose"
                                    rows={2}
                                    value={internalForm.data.purpose}
                                    onChange={(e) => internalForm.setData('purpose', e.target.value)}
                                    placeholder="Office use, demo unit, repair parts…"
                                />
                                {internalForm.errors.purpose && (
                                    <p className="text-sm text-destructive">{internalForm.errors.purpose}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setInternalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={internalForm.processing}>
                                    Record Internal Use
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Start Inventory Dialog */}
            <Dialog open={startOpen} onOpenChange={setStartOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PlayCircle className="h-5 w-5" />
                            Start Inventory Count
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitStart} className="space-y-4">
                        <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                            <p className="font-semibold">Important</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>All cash drawer sessions must be closed.</li>
                                <li>Sales will be <strong>blocked</strong> while inventory count is active.</li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2.5 text-sm">
                            <span className="text-muted-foreground">Need a paper sheet for counting?</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(route('stock.count-sheet'), '_blank')}
                            >
                                <Printer className="mr-1.5 h-4 w-4" />
                                Print Count Sheet
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="inv_notes">
                                Notes <span className="text-muted-foreground">(optional)</span>
                            </Label>
                            <Textarea
                                id="inv_notes"
                                rows={2}
                                value={startForm.data.notes}
                                onChange={(e) => startForm.setData('notes', e.target.value)}
                                placeholder="e.g. Monthly stock count…"
                            />
                        </div>

                        {startForm.errors.notes && (
                            <p className="text-sm text-destructive">{startForm.errors.notes}</p>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStartOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={startForm.processing}>
                                <PlayCircle className="mr-1.5 h-4 w-4" />
                                Start Inventory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
