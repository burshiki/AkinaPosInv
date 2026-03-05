import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Badge } from '@/Components/ui/badge';
import { Separator } from '@/Components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Puzzle, Plus, Trash2, Save, Wrench, ListTree } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Product } from '@/types';

interface ComponentProduct {
    id: number;
    name: string;
    sku: string | null;
    cost_price: number;
    stock_quantity: number;
}

interface Props {
    assemblyProducts: Product[];
    componentProducts: ComponentProduct[];
}

export default function AssembliesBuild({ assemblyProducts, componentProducts }: Props) {
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('bom');

    const selectedProduct = useMemo(
        () => assemblyProducts.find((p) => String(p.id) === selectedProductId),
        [selectedProductId, assemblyProducts]
    );

    const bomForm = useForm({
        components: [] as { component_product_id: string; quantity_needed: string }[],
    });

    const buildForm = useForm({ quantity: '1' });

    const handleProductChange = (productId: string) => {
        setSelectedProductId(productId);
        const product = assemblyProducts.find((p) => String(p.id) === productId);
        setActiveTab(product?.assembly_components?.length ? 'build' : 'bom');
        bomForm.setData(
            'components',
            product?.assembly_components?.map((c) => ({
                component_product_id: String(c.component_product_id),
                quantity_needed: String(c.quantity_needed),
            })) ?? []
        );
        buildForm.setData('quantity', '1');
    };

    const addComponent = () => {
        bomForm.setData('components', [
            ...bomForm.data.components,
            { component_product_id: '', quantity_needed: '1' },
        ]);
    };

    const removeComponent = (index: number) => {
        bomForm.setData(
            'components',
            bomForm.data.components.filter((_, i) => i !== index)
        );
    };

    const updateComponent = (
        index: number,
        field: 'component_product_id' | 'quantity_needed',
        value: string
    ) => {
        const updated = [...bomForm.data.components];
        updated[index] = { ...updated[index], [field]: value };
        bomForm.setData('components', updated);
    };

    const costBreakdown = useMemo(() => {
        return bomForm.data.components.map((comp) => {
            const cp = componentProducts.find((p) => String(p.id) === comp.component_product_id);
            const qty = parseInt(comp.quantity_needed) || 0;
            const unitCost = cp?.cost_price ?? 0;
            return { name: cp?.name ?? '—', qty, unitCost, total: unitCost * qty };
        });
    }, [bomForm.data.components, componentProducts]);

    const totalComputedCost = useMemo(
        () => costBreakdown.reduce((sum, r) => sum + r.total, 0),
        [costBreakdown]
    );

    const savedComponents = selectedProduct?.assembly_components ?? [];
    const hasSavedBom = savedComponents.length > 0;

    const maxBuildable = useMemo(() => {
        if (!hasSavedBom) return 0;
        return Math.min(
            ...savedComponents.map((comp) => {
                const available = comp.component_product?.stock_quantity ?? 0;
                return Math.floor(available / comp.quantity_needed);
            })
        );
    }, [savedComponents, hasSavedBom]);

    const handleSaveBom = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        bomForm.post(route('assemblies.save-bom', selectedProduct.id), {
            onSuccess: () => setActiveTab('build'),
        });
    };

    const handleBuild = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        buildForm.post(route('assemblies.build', selectedProduct.id), {
            onSuccess: () => {
                setSelectedProductId('');
                bomForm.setData('components', []);
                buildForm.setData('quantity', '1');
                setActiveTab('build');
            },
        });
    };

    return (
        <AuthenticatedLayout header="Assembly Builder">
            <Head title="Assembly Builder" />

            <div className="mx-auto max-w-4xl space-y-6">

                {/* Product Selector */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Puzzle className="h-5 w-5" />
                            <div>
                                <CardTitle>Select Assembled Product</CardTitle>
                                <CardDescription>Choose which product you want to configure or build.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {assemblyProducts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No assembled products found. Go to <strong>Products</strong> and create a product with
                                "Assembled Product" checked.
                            </p>
                        ) : (
                            <Select value={selectedProductId} onValueChange={handleProductChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a product..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {assemblyProducts.map((product) => (
                                        <SelectItem key={product.id} value={String(product.id)}>
                                            {product.name}
                                            {product.sku ? ` (${product.sku})` : ''}&nbsp;—&nbsp;Stock: {product.stock_quantity}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </CardContent>
                </Card>

                {/* Tabs — only visible once a product is selected */}
                {selectedProduct && (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full">
                            <TabsTrigger value="build" className="flex-1 gap-2" disabled={!hasSavedBom}>
                                <Wrench className="h-4 w-4" />
                                Build Units
                                {!hasSavedBom && (
                                    <span className="ml-1 text-xs text-muted-foreground">(save BOM first)</span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="bom" className="flex-1 gap-2">
                                <ListTree className="h-4 w-4" />
                                Bill of Materials
                            </TabsTrigger>
                        </TabsList>

                        {/* ── TAB 1: Build Units ── */}
                        <TabsContent value="bom">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{selectedProduct.name} — Components</CardTitle>
                                            <CardDescription>
                                                Current cost price:{' '}
                                                <strong>{formatCurrency(selectedProduct.cost_price)}</strong>
                                                {' '}· Define what parts this product is made of. Cost price will be recomputed on save.
                                            </CardDescription>
                                        </div>
                                        <Button type="button" size="sm" variant="outline" onClick={addComponent}>
                                            <Plus className="mr-1 h-4 w-4" /> Add Component
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {componentProducts.length === 0 ? (
                                        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                                            No component products found. Go to <strong>Products</strong> and mark
                                            items as "Component Part".
                                        </p>
                                    ) : (
                                        <form id="bom-form" onSubmit={handleSaveBom} className="space-y-4">
                                            {bomForm.data.components.length === 0 ? (
                                                <p className="py-8 text-center text-sm text-muted-foreground">
                                                    No components yet. Click <strong>Add Component</strong> to start
                                                    defining what this product is made of.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        <span>Component</span>
                                                        <span className="text-right">Qty</span>
                                                        <span className="text-right">Line Cost</span>
                                                        <span />
                                                    </div>
                                                    {bomForm.data.components.map((comp, index) => {
                                                        const cp = componentProducts.find(
                                                            (p) => String(p.id) === comp.component_product_id
                                                        );
                                                        const qty = parseInt(comp.quantity_needed) || 0;
                                                        return (
                                                            <div
                                                                key={index}
                                                                className="grid grid-cols-[1fr_80px_100px_36px] items-center gap-2"
                                                            >
                                                                <Select
                                                                    value={comp.component_product_id}
                                                                    onValueChange={(v) =>
                                                                        updateComponent(index, 'component_product_id', v)
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select component..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {componentProducts.map((p) => (
                                                                            <SelectItem key={p.id} value={String(p.id)}>
                                                                                {p.name}
                                                                                {p.sku ? ` (${p.sku})` : ''} — Stock: {p.stock_quantity}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    className="text-right"
                                                                    placeholder="Qty"
                                                                    value={comp.quantity_needed}
                                                                    onChange={(e) =>
                                                                        updateComponent(index, 'quantity_needed', e.target.value)
                                                                    }
                                                                />
                                                                <div className="text-right text-sm tabular-nums">
                                                                    {cp ? formatCurrency(cp.cost_price * qty) : '—'}
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeComponent(index)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <Separator />

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm">
                                                    Computed cost:{' '}
                                                    <span className="text-base font-semibold">
                                                        {formatCurrency(totalComputedCost)}
                                                    </span>
                                                    {bomForm.data.components.length > 0 && (
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            (saves as {selectedProduct.name}'s cost price)
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type="submit"
                                                    form="bom-form"
                                                    disabled={
                                                        bomForm.processing ||
                                                        bomForm.data.components.some((c) => !c.component_product_id)
                                                    }
                                                >
                                                    <Save className="mr-2 h-4 w-4" />
                                                    {bomForm.processing ? 'Saving...' : 'Save BOM'}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── TAB 2: Bill of Materials ── */}
                        <TabsContent value="build">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{selectedProduct.name} — Build Units</CardTitle>
                                    <CardDescription>
                                        Components will be consumed from stock and{' '}
                                        <strong>{selectedProduct.name}</strong> stock will increase.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Component</TableHead>
                                                <TableHead className="text-right">Per Unit</TableHead>
                                                <TableHead className="text-right">In Stock</TableHead>
                                                <TableHead className="text-right">
                                                    Needed ({buildForm.data.quantity}×)
                                                </TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {savedComponents.map((comp) => {
                                                const needed =
                                                    comp.quantity_needed * (parseInt(buildForm.data.quantity) || 0);
                                                const available = comp.component_product?.stock_quantity ?? 0;
                                                const sufficient = available >= needed;
                                                return (
                                                    <TableRow key={comp.id}>
                                                        <TableCell className="font-medium">
                                                            {comp.component_product?.name}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {comp.quantity_needed}
                                                        </TableCell>
                                                        <TableCell className="text-right">{available}</TableCell>
                                                        <TableCell className="text-right">{needed}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={sufficient ? 'success' : 'destructive'}>
                                                                {sufficient ? 'OK' : 'Insufficient'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>

                                    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                                        <span>
                                            Max buildable: <strong>{maxBuildable}</strong> unit(s)
                                        </span>
                                        <span className="text-muted-foreground">
                                            Cost price per unit:{' '}
                                            <strong>{formatCurrency(selectedProduct.cost_price)}</strong>
                                        </span>
                                    </div>

                                    <form onSubmit={handleBuild} className="flex items-end gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="build_qty">Quantity to Build</Label>
                                            <Input
                                                id="build_qty"
                                                type="number"
                                                min="1"
                                                max={maxBuildable}
                                                value={buildForm.data.quantity}
                                                onChange={(e) => buildForm.setData('quantity', e.target.value)}
                                                className="w-32"
                                            />
                                            {buildForm.errors.quantity && (
                                                <p className="text-sm text-destructive">
                                                    {buildForm.errors.quantity}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={
                                                buildForm.processing ||
                                                maxBuildable === 0 ||
                                                parseInt(buildForm.data.quantity) > maxBuildable
                                            }
                                        >
                                            <Wrench className="mr-2 h-4 w-4" />
                                            {buildForm.processing
                                                ? 'Building...'
                                                : `Build ${buildForm.data.quantity} Unit(s)`}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
