import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Trash2, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import type { Product, Customer } from '@/types';

interface CartItem {
    product_id:   number | null;
    product_name: string;
    product_sku:  string | null;
    quantity:     number;
    unit_price:   number;
    subtotal:     number;
}

interface Props {
    open:      boolean;
    onClose:   () => void;
    products:  Pick<Product, 'id' | 'name' | 'sku' | 'selling_price'>[];
    customers: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>[];
}

export default function CreateModal({ open, onClose, products, customers }: Props) {
    const [cart, setCart]                     = useState<CartItem[]>([]);
    const [productSearch, setProductSearch]   = useState('');
    const [showProducts, setShowProducts]     = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomers, setShowCustomers]   = useState(false);
    const [customerId, setCustomerId]         = useState<number | null>(null);
    const [customerName, setCustomerName]     = useState('');
    const [customerEmail, setCustomerEmail]   = useState('');
    const [customerPhone, setCustomerPhone]   = useState('');
    const [discountType, setDiscountType]     = useState<'fixed' | 'percentage'>('fixed');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [notes, setNotes]                   = useState('');
    const [validUntil, setValidUntil]         = useState('');
    const [processing, setProcessing]         = useState(false);
    const [errors, setErrors]                 = useState<Record<string, string>>({});

    const filteredProducts = productSearch.length > 0
        ? products.filter((p) =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.sku ?? '').toLowerCase().includes(productSearch.toLowerCase()))
        : [];

    const filteredCustomers = customerSearch.length > 0
        ? customers.filter((c) =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            (c.email ?? '').toLowerCase().includes(customerSearch.toLowerCase()))
        : [];

    const subtotal      = cart.reduce((s, i) => s + i.subtotal, 0);
    const discountValue = discountType === 'percentage'
        ? subtotal * (discountAmount / 100)
        : discountAmount;
    const total = Math.max(0, subtotal - discountValue);

    function resetForm() {
        setCart([]);
        setProductSearch('');
        setCustomerSearch('');
        setCustomerId(null);
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setDiscountType('fixed');
        setDiscountAmount(0);
        setNotes('');
        setValidUntil('');
        setErrors({});
        setProcessing(false);
    }

    function handleOpenChange(v: boolean) {
        if (!v) { resetForm(); onClose(); }
    }

    function addProduct(p: typeof products[0]) {
        setCart((prev) => {
            const idx = prev.findIndex((i) => i.product_id === p.id);
            if (idx >= 0) {
                return prev.map((i, j) => j === idx
                    ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
                    : i);
            }
            return [...prev, {
                product_id:   p.id,
                product_name: p.name,
                product_sku:  p.sku ?? null,
                quantity:     1,
                unit_price:   p.selling_price,
                subtotal:     p.selling_price,
            }];
        });
        setProductSearch('');
        setShowProducts(false);
    }

    function addCustomItem() {
        if (!productSearch.trim()) return;
        setCart((prev) => [...prev, {
            product_id:   null,
            product_name: productSearch.trim(),
            product_sku:  null,
            quantity:     1,
            unit_price:   0,
            subtotal:     0,
        }]);
        setProductSearch('');
        setShowProducts(false);
    }

    function updateQty(idx: number, qty: number) {
        setCart((prev) => prev.map((i, j) => j === idx
            ? { ...i, quantity: qty, subtotal: qty * i.unit_price }
            : i));
    }

    function updatePrice(idx: number, price: number) {
        setCart((prev) => prev.map((i, j) => j === idx
            ? { ...i, unit_price: price, subtotal: i.quantity * price }
            : i));
    }

    function removeItem(idx: number) {
        setCart((prev) => prev.filter((_, j) => j !== idx));
    }

    function selectCustomer(c: typeof customers[0]) {
        setCustomerId(c.id);
        setCustomerName(c.name);
        setCustomerEmail(c.email ?? '');
        setCustomerPhone(c.phone ?? '');
        setCustomerSearch(c.name);
        setShowCustomers(false);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (cart.length === 0) return;
        setProcessing(true);
        router.post(route('quotations.store'), {
            customer_id:     customerId,
            customer_name:   customerName   || null,
            customer_email:  customerEmail  || null,
            customer_phone:  customerPhone  || null,
            discount_type:   discountType,
            discount_amount: discountAmount,
            notes:           notes          || null,
            valid_until:     validUntil     || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: cart as any,
        }, {
            onError:  (e) => { setErrors(e); setProcessing(false); },
            onFinish: () => setProcessing(false),
            onSuccess: () => { resetForm(); onClose(); },
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        New Quotation
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Items panel */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="rounded-lg border p-4 space-y-4">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Items</h2>

                                {/* Product search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products to add…"
                                        className="pl-9"
                                        value={productSearch}
                                        onChange={(e) => { setProductSearch(e.target.value); setShowProducts(true); }}
                                        onFocus={() => setShowProducts(true)}
                                        onBlur={() => setTimeout(() => setShowProducts(false), 150)}
                                    />
                                    {showProducts && (filteredProducts.length > 0 || productSearch.trim()) && (
                                        <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
                                            {filteredProducts.map((p) => (
                                                <button key={p.id} type="button"
                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                                                    onMouseDown={() => addProduct(p)}
                                                >
                                                    <div>
                                                        <div className="font-medium">{p.name}</div>
                                                        {p.sku && <div className="text-xs text-muted-foreground">{p.sku}</div>}
                                                    </div>
                                                    <span className="text-muted-foreground ml-4 shrink-0">{formatCurrency(p.selling_price)}</span>
                                                </button>
                                            ))}
                                            {productSearch.trim() && (
                                                <button type="button"
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left border-t"
                                                    onMouseDown={addCustomItem}
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add "{productSearch.trim()}" as custom item
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Cart */}
                                {cart.length > 0 ? (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead className="w-24">Qty</TableHead>
                                                    <TableHead className="w-32">Unit Price</TableHead>
                                                    <TableHead className="w-28 text-right">Amount</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cart.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell>
                                                            <div className="font-medium text-sm">{item.product_name}</div>
                                                            {item.product_sku && <div className="text-xs text-muted-foreground">{item.product_sku}</div>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" min={1} className="h-8 w-20"
                                                                value={item.quantity}
                                                                onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input type="number" min={0} step="0.01" className="h-8 w-28"
                                                                value={item.unit_price}
                                                                onChange={(e) => updatePrice(idx, parseFloat(e.target.value) || 0)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                                        <TableCell>
                                                            <Button type="button" size="icon" variant="ghost"
                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                onClick={() => removeItem(idx)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-center py-6 text-muted-foreground text-sm">
                                        Search for products above to add items.
                                    </p>
                                )}
                                {errors.items && <p className="text-xs text-destructive">{errors.items}</p>}
                            </div>
                        </div>

                        {/* Right sidebar */}
                        <div className="space-y-4">
                            {/* Customer */}
                            <div className="rounded-lg border p-4 space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Customer</h2>
                                <div className="relative">
                                    <Input placeholder="Search existing customers…"
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomers(true);
                                            if (!e.target.value) setCustomerId(null);
                                        }}
                                        onFocus={() => setShowCustomers(true)}
                                        onBlur={() => setTimeout(() => setShowCustomers(false), 150)}
                                    />
                                    {showCustomers && filteredCustomers.length > 0 && (
                                        <div className="absolute z-20 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-auto">
                                            {filteredCustomers.map((c) => (
                                                <button key={c.id} type="button"
                                                    className="w-full px-3 py-2 text-sm hover:bg-accent text-left"
                                                    onMouseDown={() => selectCustomer(c)}
                                                >
                                                    <div className="font-medium">{c.name}</div>
                                                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs">Name</Label>
                                        <Input className="h-8 text-sm mt-1" placeholder="Customer name"
                                            value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Email</Label>
                                        <Input className="h-8 text-sm mt-1" type="email" placeholder="email@example.com"
                                            value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                                        {errors.customer_email && <p className="text-xs text-destructive mt-0.5">{errors.customer_email}</p>}
                                    </div>
                                    <div>
                                        <Label className="text-xs">Phone</Label>
                                        <Input className="h-8 text-sm mt-1" placeholder="Phone number"
                                            value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Discount */}
                            <div className="rounded-lg border p-4 space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Discount</h2>
                                <div className="flex gap-2">
                                    <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
                                        <SelectTrigger className="w-32 h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fixed">Fixed</SelectItem>
                                            <SelectItem value="percentage">Percent (%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" min={0} step="0.01" className="h-8 text-sm"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="rounded-lg border p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {discountValue > 0 && (
                                    <div className="flex justify-between text-destructive">
                                        <span>Discount</span>
                                        <span>-{formatCurrency(discountValue)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t pt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Valid until + Notes */}
                            <div className="rounded-lg border p-4 space-y-3">
                                <div>
                                    <Label className="text-xs">Valid Until</Label>
                                    <Input type="date" className="h-8 text-sm mt-1"
                                        value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea className="text-sm mt-1" rows={3}
                                        placeholder="Additional notes or terms…"
                                        value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || cart.length === 0}>
                            {processing ? 'Creating…' : 'Create Quotation'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
