import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ReceiptPrinter } from '@/Components/app/receipt-printer';
import { SalesCommandPalette } from '@/Components/app/sales-command-palette';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, Trash2, Search, X, UserRound, UserPlus, Lock, Wrench, Truck } from 'lucide-react';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import type { Product, Category, BankAccount, Customer, CashDrawerSession, Sale, Quotation, RepairJob } from '@/types';

interface Props {
    products: Product[];
    categories: Category[];
    bankAccounts: BankAccount[];
    customers: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>[];
    drawerSession: CashDrawerSession;
    completedSale: Sale | null;
    initialQuotation: Quotation | null;
    initialRepairJob: RepairJob | null;
    repairQueue: Pick<RepairJob, 'id' | 'job_number' | 'customer_name' | 'customer_phone' | 'repair_fee' | 'completed_at'>[];
}

interface CartItem {
    product: Product;
    quantity: number;
    /** Custom price override (used for repair job components, bypasses product.selling_price) */
    unitPrice?: number;
}

export default function SalesCreate({ products, categories, bankAccounts, customers, drawerSession, completedSale, initialQuotation, initialRepairJob, repairQueue }: Props) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'credit' | 'multi'>('cash');
    const [bankAccountId, setBankAccountId] = useState<string>('');
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [discountAmount, setDiscountAmount] = useState<string>('0');
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    // Local mutable copy of customers so quick-adds appear immediately
    const [localCustomers, setLocalCustomers] = useState<Pick<Customer, 'id' | 'name' | 'phone' | 'email'>[]>(customers);
    // Quick-add customer dialog
    const [repairFee, setRepairFee] = useState<string>(String(initialRepairJob?.repair_fee ?? '0'));
    const [showRepairQueue, setShowRepairQueue] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickName, setQuickName] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [quickEmail, setQuickEmail] = useState('');
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});
    // Shipping state
    const [hasShipping, setHasShipping] = useState(false);
    const [shippingFee, setShippingFee] = useState<string>('');
    const [shippingNotes, setShippingNotes] = useState<string>('');
    // Multi-payment state
    interface PaymentLine {
        id: string;
        method: 'cash' | 'online' | 'credit' | 'check';
        amount: number;
        bankAccountId?: string;
        reference?: string;
    }
    const [payments, setPayments] = useState<PaymentLine[]>([{ id: '1', method: 'cash', amount: 0 }]);
    // Cart resizing state
    const [cartWidth, setCartWidth] = useState(384); // Initial: w-96 = 384px
    const [isResizing, setIsResizing] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const cartPanelRef = useRef<HTMLDivElement>(null);

    // Check if multi-payment includes credit
    const hasMultiCredit = useMemo(() => {
        return paymentMethod === 'multi' && payments.some(p => p.method === 'credit' && p.amount > 0);
    }, [paymentMethod, payments]);

    // Open receipt modal when a completed sale arrives
    useEffect(() => {
        if (completedSale) setShowReceiptModal(true);
    }, [completedSale]);

    // Pre-populate cart + customer from a quotation OR repair job (once on mount)
    useEffect(() => {
        if (initialRepairJob) {
            // Build cart from repair job components
            const preCart: CartItem[] = [];
            (initialRepairJob.components ?? []).forEach((comp) => {
                const product = products.find((p) => p.id === comp.product_id);
                if (!product) return;
                preCart.push({ product, quantity: comp.quantity, unitPrice: comp.unit_price });
            });
            if (preCart.length > 0) setCart(preCart);
            // Pre-fill customer
            if (initialRepairJob.customer_id) {
                const c = customers.find((c) => c.id === initialRepairJob.customer_id);
                if (c) {
                    setSelectedCustomerId(c.id);
                    setCustomerName(c.name);
                    setCustomerPhone(c.phone ?? '');
                    setCustomerSearch(c.name);
                }
            } else {
                setCustomerName(initialRepairJob.customer_name);
                setCustomerPhone(initialRepairJob.customer_phone ?? '');
                setCustomerSearch(initialRepairJob.customer_name);
            }
            return;
        }
        if (!initialQuotation) return;
        // Build cart from matching products
        const preCart: CartItem[] = [];
        (initialQuotation.items ?? []).forEach((item) => {
            if (!item.product_id) return;
            const product = products.find((p) => p.id === item.product_id);
            if (!product) return;
            preCart.push({ product, quantity: item.quantity });
        });
        if (preCart.length > 0) setCart(preCart);
        // Pre-fill customer
        if (initialQuotation.customer_id) {
            const c = customers.find((c) => c.id === initialQuotation.customer_id);
            if (c) {
                setSelectedCustomerId(c.id);
                setCustomerName(c.name);
                setCustomerPhone(c.phone ?? '');
                setCustomerSearch(c.name);
            }
        } else if (initialQuotation.customer_name) {
            setCustomerName(initialQuotation.customer_name);
            setCustomerPhone(initialQuotation.customer_phone ?? '');
            setCustomerSearch(initialQuotation.customer_name);
        }
        // Pre-fill discount (quotation: 'fixed'/'percentage' → POS: 'amount'/'percent')
        if (initialQuotation.discount_amount > 0) {
            setDiscountType(initialQuotation.discount_type === 'percentage' ? 'percent' : 'amount');
            setDiscountAmount(String(initialQuotation.discount_amount));
        }
        // Pre-fill notes
        if (initialQuotation.notes) setNotes(initialQuotation.notes);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCloseReceipt = () => {
        setShowReceiptModal(false);
        searchRef.current?.focus();
    };

    // Auto-focus search / barcode input
    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    // Close customer dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // POS keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K / Cmd+K — open Sales command palette (override global palette)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                e.stopPropagation();
                setShowPalette(prev => !prev);
                return;
            }

            // Don't intercept when typing in an input/textarea
            const tag = (e.target as HTMLElement).tagName;
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

            if (e.key === 'F1') {
                e.preventDefault();
                setPaymentMethod('cash');
            } else if (e.key === 'F2') {
                e.preventDefault();
                setPaymentMethod('online');
            } else if (e.key === 'F3') {
                e.preventDefault();
                setPaymentMethod('credit');
            } else if (e.key === 'F4') {
                e.preventDefault();
                setPaymentMethod('multi');
            } else if (e.key === 'Escape') {
                if (showPalette) {
                    setShowPalette(false);
                } else if (cart.length > 0 && !isInput) {
                    setCart([]);
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [cart, showPalette]);

    // Cart resize handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing || !cartPanelRef.current) return;
            
            // Get the container width (main layout width)
            const layout = cartPanelRef.current.parentElement;
            if (!layout) return;
            
            const layoutRect = layout.getBoundingClientRect();
            const containerRight = layoutRect.right;
            const newWidth = Math.max(320, Math.min(800, containerRight - e.clientX));
            setCartWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isResizing]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let filtered = products;
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((p) => String(p.category_id) === selectedCategory);
        }
        if (search.trim()) {
            const term = search.toLowerCase().trim();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    (p.sku ?? '').toLowerCase().includes(term) ||
                    (p.barcode && p.barcode.toLowerCase() === term)
            );
        }
        return filtered;
    }, [products, selectedCategory, search]);

    // Filtered customers for dropdown
    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return localCustomers;
        const term = customerSearch.toLowerCase().trim();
        return localCustomers.filter(
            (c) =>
                c.name.toLowerCase().includes(term) ||
                (c.phone ?? '').toLowerCase().includes(term) ||
                (c.email ?? '').toLowerCase().includes(term)
        );
    }, [localCustomers, customerSearch]);

    // Cart calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice ?? item.product.selling_price) * item.quantity, 0);
    const repairFeeAmount = initialRepairJob ? (parseFloat(repairFee) || 0) : 0;
    const discountRaw = parseFloat(discountAmount) || 0;
    const discount = discountType === 'percent'
        ? Math.min(Math.round(subtotal * (discountRaw / 100) * 100) / 100, subtotal)
        : Math.min(discountRaw, subtotal);
    const total = Math.max(0, subtotal - discount + repairFeeAmount);
    const tendered = parseFloat(amountTendered) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, tendered - total) : 0;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, total - totalPaid);

    const addToCart = useCallback((product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                // Repair job sales are not capped by stock
                if (!initialRepairJob && existing.quantity >= product.stock_quantity) return prev;
                return prev.map((item) =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            if (!initialRepairJob && product.stock_quantity <= 0) return prev;
            return [...prev, { product, quantity: 1 }];
        });
    }, [initialRepairJob]);

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart((prev) =>
            prev.map((item) => {
                if (item.product.id !== productId) return item;
                // No stock cap in repair job mode OR when a technician-set unit price is pre-loaded
                if (initialRepairJob || item.unitPrice !== undefined) {
                    return { ...item, quantity };
                }
                return { ...item, quantity: Math.min(quantity, item.product.stock_quantity) };
            })
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    // Handle barcode scanning (Enter key submits the exact match)
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && search.trim()) {
            const exactMatch = products.find(
                (p) => p.barcode?.toLowerCase() === search.toLowerCase().trim() || (p.sku ?? '').toLowerCase() === search.toLowerCase().trim()
            );
            if (exactMatch) {
                addToCart(exactMatch);
                setSearch('');
            }
        }
    };

    const selectCustomer = (customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email'>) => {
        setSelectedCustomerId(customer.id);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone ?? '');
        setCustomerSearch(customer.name);
        setShowCustomerDropdown(false);
    };

    const clearCustomer = () => {
        setSelectedCustomerId(null);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerSearch('');
    };

    const openQuickAdd = () => {
        // Pre-fill name with whatever's typed in the search box
        setQuickName(customerSearch.trim());
        setQuickPhone('');
        setQuickEmail('');
        setQuickErrors({});
        setShowQuickAdd(true);
    };

    const handleQuickAddSubmit = async () => {
        if (!quickName.trim()) {
            setQuickErrors({ name: 'Name is required.' });
            return;
        }
        setQuickLoading(true);
        setQuickErrors({});
        try {
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const { data } = await axios.post<Pick<Customer, 'id' | 'name' | 'phone' | 'email'>>(
                route('customers.quick-store'),
                { name: quickName.trim(), phone: quickPhone.trim() || null, email: quickEmail.trim() || null },
                { headers: { 'X-CSRF-TOKEN': csrf } }
            );
            setLocalCustomers((prev) => [...prev, data]);
            selectCustomer(data);
            setShowQuickAdd(false);
            setQuickName(''); setQuickPhone(''); setQuickEmail('');
        } catch (err: any) {
            if (err.response?.status === 422) {
                const errs: Record<string, string> = {};
                Object.entries(err.response.data.errors ?? {}).forEach(([k, v]) => {
                    errs[k] = (v as string[])[0];
                });
                setQuickErrors(errs);
            } else {
                setQuickErrors({ name: 'Something went wrong. Please try again.' });
            }
        } finally {
            setQuickLoading(false);
        }
    };

    const handleSubmit = () => {
        const hasRepairFee = initialRepairJob && repairFeeAmount > 0;
        if (cart.length === 0 && !hasRepairFee) return;
        if (paymentMethod === 'cash' && tendered < total) return;
        if (paymentMethod === 'online' && !bankAccountId) return;
        if (paymentMethod === 'credit' && !selectedCustomerId) return;
        if (paymentMethod === 'multi' && totalPaid < total) return;

        setProcessing(true);

        router.post(
            route('sales.store'),
            {
                payment_method: paymentMethod,
                bank_account_id: paymentMethod === 'online' ? bankAccountId : null,
                amount_tendered: paymentMethod === 'cash' ? amountTendered : null,
                payments: paymentMethod === 'multi' ? payments.map(p => ({
                    method: p.method,
                    amount: p.amount,
                    bank_account_id: p.bankAccountId || null,
                    reference_number: p.reference || null,
                })) : null,
                customer_id: selectedCustomerId,
                customer_name: customerName.trim() || 'Walk-in',
                customer_phone: customerPhone || null,
                discount_amount: discountAmount || '0',
                discount_type: discountType,
                notes: notes || null,
                repair_job_id: initialRepairJob?.id ?? null,
                has_shipping: hasShipping || null,
                shipping_fee: hasShipping && shippingFee !== '' ? shippingFee : null,
                shipping_notes: hasShipping && shippingNotes.trim() ? shippingNotes.trim() : null,
                items: [
                    ...cart.map((item) => ({
                        product_id: item.product.id,
                        quantity: item.quantity,
                        unit_price: item.unitPrice ?? item.product.selling_price,
                    })),
                    ...(hasRepairFee ? [{
                        product_id: null,
                        product_name: 'Repair Service Fee',
                        quantity: 1,
                        unit_price: repairFeeAmount,
                    }] : []),
                ],
            },
            {
                onSuccess: () => {
                    setCart([]);
                    setAmountTendered('');
                    clearCustomer();
                    setDiscountAmount('0');
                    setNotes('');
                    setHasShipping(false);
                    setShippingFee('');
                    setShippingNotes('');
                    setProcessing(false);
                },
                onError: () => setProcessing(false),
            }
        );
    };

    return (
        <>
        <AuthenticatedLayout header="Point of Sale">
            <Head title="POS" />

            {/* Cash Drawer Session Bar */}
            <div className="mb-4 flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
                <div className="flex items-center gap-3 text-sm">
                    <Badge variant="success" className="text-xs">Drawer Open</Badge>
                    <span className="text-muted-foreground">
                        Opening: <span className="font-medium text-foreground">{formatCurrency(drawerSession.opening_balance)}</span>
                    </span>
                    <span className="text-muted-foreground">
                        Opened: <span className="font-medium text-foreground">{new Date(drawerSession.opened_at).toLocaleTimeString()}</span>
                    </span>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('cash-drawer.close')}>
                        <Lock className="mr-2 h-3 w-3" /> Close Drawer
                    </Link>
                </Button>
            </div>

            {/* Repair job banner */}
            {initialRepairJob && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                    <span className="font-semibold">Repair Job:</span>
                    <span className="font-mono">{initialRepairJob.job_number}</span>
                    <span className="text-muted-foreground">— {initialRepairJob.customer_name}</span>
                    {initialRepairJob.components && initialRepairJob.components.length > 0 && (
                        <span className="ml-1 text-xs opacity-70">({initialRepairJob.components.length} component{initialRepairJob.components.length !== 1 ? 's' : ''} pre-loaded)</span>
                    )}
                </div>
            )}

            {/* Quotation banner */}
            {initialQuotation && (
                <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    <span className="font-semibold">Quotation loaded:</span>
                    <span className="font-mono">{initialQuotation.quotation_number}</span>
                    {initialQuotation.items && initialQuotation.items.some((i) => !i.product_id) && (
                        <span className="ml-1 text-xs opacity-70">(custom items without a product were skipped)</span>
                    )}
                </div>
            )}

            <div className="flex h-[calc(100vh-11rem)] gap-4">
                {/* Left Panel - Products */}
                <div className="flex flex-1 flex-col space-y-4">
                    {/* Search / Barcode */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={searchRef}
                            placeholder="Scan barcode or search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="pl-9"
                        />
                    </div>

                    {/* Category tabs */}
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                        <TabsList className="flex-wrap h-auto">
                            <TabsTrigger value="all">All</TabsTrigger>
                            {categories.map((cat) => (
                                <TabsTrigger key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {/* Product Grid */}
                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {filteredProducts.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    disabled={!initialRepairJob && product.stock_quantity <= 0}
                                    className="rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="font-medium text-sm truncate">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                    <div className="mt-1 flex items-center justify-between">
                                        <span className="font-bold text-sm">{formatCurrency(product.selling_price)}</span>
                                        <Badge variant={product.stock_quantity <= 0 ? 'destructive' : 'secondary'} className="text-xs">
                                            {product.stock_quantity}
                                        </Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel - Cart (with resize handle) */}
                <div className="relative flex">
                    {/* Resize Handle */}
                    <div
                        onMouseDown={() => setIsResizing(true)}
                        className="w-1 bg-border hover:bg-primary/60 cursor-col-resize transition-colors shrink-0"
                        title="Drag to resize cart"
                    />
                    <Card ref={cartPanelRef} className="flex flex-col" style={{ width: `${cartWidth}px` }}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ShoppingCart className="h-5 w-5" />
                                    Cart ({cart.length})
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowPalette(true)}
                                        className="hidden items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent sm:flex"
                                        title="Open command palette"
                                    >
                                        <span>⌘K</span>
                                    </button>
                                    {repairQueue.length > 0 && !initialRepairJob && (
                                        <button
                                            type="button"
                                            onClick={() => setShowRepairQueue(true)}
                                            className="relative flex items-center gap-1 rounded border bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                                            title="Repair jobs waiting for payment"
                                        >
                                            <Wrench className="h-3 w-3" />
                                            Repairs
                                            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">
                                                {repairQueue.length}
                                            </span>
                                        </button>
                                    )}
                                    {cart.length > 0 && (
                                        <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                                            <X className="mr-1 h-3 w-3" /> Clear
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />

                        {/* Customer Selector (always visible, optional) */}
                        <div className="border-b px-4 py-2">
                            <div className="relative" ref={customerDropdownRef}>
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-xs flex items-center gap-1">
                                        <UserRound className="h-3 w-3" /> Customer (optional)
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5"
                                        title="Add new customer"
                                        onClick={openQuickAdd}
                                    >
                                        <UserPlus className="h-3 w-3" />
                                    </Button>
                                </div>
                                {selectedCustomerId ? (
                                    <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-1.5 text-sm">
                                        <div>
                                            <span className="font-medium">{customerName}</span>
                                            {customerPhone && (
                                                <span className="ml-2 text-muted-foreground">{customerPhone}</span>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearCustomer}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Input
                                            placeholder="Search customer..."
                                            value={customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            className="h-8 text-sm"
                                        />
                                        {showCustomerDropdown && customerSearch.trim() && (
                                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                                                {filteredCustomers.length === 0 ? (
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent text-primary"
                                                        onClick={openQuickAdd}
                                                    >
                                                        <UserPlus className="h-3 w-3 shrink-0" />
                                                        <span>Create "<strong>{customerSearch}</strong>"</span>
                                                    </button>
                                                ) : (
                                                    <>
                                                        {filteredCustomers.slice(0, 10).map((customer) => (
                                                            <button
                                                                key={customer.id}
                                                                type="button"
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                                                                onClick={() => selectCustomer(customer)}
                                                            >
                                                                <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-medium">{customer.name}</p>
                                                                    {customer.phone && (
                                                                        <p className="truncate text-xs text-muted-foreground">{customer.phone}</p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm hover:bg-accent text-primary"
                                                            onClick={openQuickAdd}
                                                        >
                                                            <UserPlus className="h-3 w-3 shrink-0" />
                                                            <span>Add new customer…</span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                            {/* Cart Items */}
                            <ScrollArea className="flex-1 p-4">
                                {cart.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">Cart is empty</p>
                                ) : (
                                    <div className="space-y-3">
                                        {cart.map((item) => (
                                            <div key={item.product.id} className="flex flex-col gap-2 rounded-md border p-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
                                                        <p className="text-xs font-bold">
                                                            {formatCurrency(item.unitPrice ?? item.product.selling_price)}
                                                            {item.unitPrice !== undefined && item.unitPrice !== item.product.selling_price && (
                                                                <span className="ml-1 line-through opacity-50 font-normal">{formatCurrency(item.product.selling_price)}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-1 justify-between">
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={(!initialRepairJob && item.unitPrice === undefined) ? item.product.stock_quantity : undefined}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!isNaN(val)) updateQuantity(item.product.id, val);
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        className="flex-1 h-7 text-center text-sm font-medium border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                        {/* Totals & Payment */}
                        <div className="border-t p-4 space-y-3">
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                {initialRepairJob && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span>Repair Fee:</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">₱</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={repairFee}
                                                onChange={(e) => setRepairFee(e.target.value)}
                                                className="h-7 w-24 text-right text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                    <span>Discount <kbd className="text-[10px] opacity-50">F4</kbd>:</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType(discountType === 'amount' ? 'percent' : 'amount')}
                                            className="h-7 rounded border px-1.5 text-xs font-medium hover:bg-accent shrink-0"
                                            title="Toggle discount type"
                                        >
                                            {discountType === 'percent' ? '%' : '₱'}
                                        </button>
                                        <Input
                                            id="discount-input"
                                            type="number"
                                            min="0"
                                            max={discountType === 'percent' ? '100' : undefined}
                                            step="0.01"
                                            value={discountAmount}
                                            onChange={(e) => setDiscountAmount(e.target.value)}
                                            className="h-7 w-24 text-right text-sm"
                                        />
                                    </div>
                                </div>
                                {discount > 0 && discountType === 'percent' && (
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>({discountRaw}% off)</span>
                                        <span>-{formatCurrency(discount)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-base font-bold">
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(total)}</span>
                                </div>
                            </div>

                            {/* Shipping / Delivery */}
                            <div className="border rounded-md px-3 py-2 space-y-2">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between text-sm"
                                    onClick={() => setHasShipping(!hasShipping)}
                                >
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Truck className="h-3.5 w-3.5" />
                                        For Delivery / Shipping
                                    </span>
                                    <span className={`h-4 w-7 rounded-full transition-colors ${hasShipping ? 'bg-primary' : 'bg-muted-foreground/30'} relative`}>
                                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${hasShipping ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                    </span>
                                </button>
                                {hasShipping && (
                                    <div className="space-y-2 pt-1">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Shipping Fee (optional)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={shippingFee}
                                                onChange={(e) => setShippingFee(e.target.value)}
                                                placeholder="TBD"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        {shippingFee === '' && (
                                            <p className="text-xs text-muted-foreground">Leave fee blank if not yet confirmed — you can update it later.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <Label className="text-xs">Payment Method</Label>
                                <div className="flex gap-1 flex-wrap">
                                    {([
                                        { key: 'cash', shortcut: 'F1' },
                                        { key: 'online', shortcut: 'F2' },
                                        { key: 'credit', shortcut: 'F3' },
                                        { key: 'multi', shortcut: 'F4' },
                                    ] as const).map(({ key, shortcut }) => (
                                        <Button
                                            key={key}
                                            variant={paymentMethod === key ? 'default' : 'outline'}
                                            size="sm"
                                            className={key === 'multi' ? 'text-xs' : 'flex-1 text-xs'}
                                            onClick={() => setPaymentMethod(key)}
                                        >
                                            {key === 'multi' ? 'Multi' : key.charAt(0).toUpperCase() + key.slice(1)}
                                            <kbd className="ml-1 text-[10px] opacity-50">{shortcut}</kbd>
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment-method-specific fields */}
                            {paymentMethod === 'online' && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Bank Account</Label>
                                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {bankAccounts.map((acct) => (
                                                <SelectItem key={acct.id} value={String(acct.id)}>
                                                    {acct.bank_name || acct.name} ({formatCurrency(acct.balance)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {paymentMethod === 'cash' && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Amount Tendered</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => setAmountTendered(total.toFixed(2))}
                                        >
                                            Exact
                                        </Button>
                                    </div>
                                    <Input
                                        type="number"
                                        min={total}
                                        step="0.01"
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                    <div className="flex justify-between text-sm font-medium text-green-600">
                                        <span>Change:</span>
                                        <span>{formatCurrency(change)}</span>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'credit' && selectedCustomerId && (
                                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                                    Credit sale will be recorded for <span className="font-semibold">{customerName}</span>.
                                </div>
                            )}

                            {paymentMethod === 'credit' && !selectedCustomerId && (
                                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200">
                                    Please select a customer above to record a credit sale.
                                </div>
                            )}

                            {/* Multi-Payment Breakdown */}
                            {paymentMethod === 'multi' && (
                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold">Payment Breakdown</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => setPayments([...payments, { id: Date.now().toString(), method: 'cash', amount: Math.max(0, total - totalPaid) }])}
                                            disabled={remainingBalance <= 0}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Method
                                        </Button>
                                    </div>

                                    {/* Payment lines */}
                                    <div className="space-y-2">
                                        {payments.map((payment) => (
                                            <div key={payment.id} className="flex gap-2 items-start">
                                                {/* Method select */}
                                                <Select value={payment.method} onValueChange={(m) => setPayments(payments.map(p => p.id === payment.id ? { ...p, method: m as any } : p))}>
                                                    <SelectTrigger className="h-8 w-28 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="cash">Cash</SelectItem>
                                                        <SelectItem value="online">Online</SelectItem>
                                                        <SelectItem value="credit">Credit</SelectItem>
                                                        <SelectItem value="check">Check</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {/* Amount input */}
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={payment.amount || ''}
                                                    onChange={(e) => setPayments(payments.map(p => p.id === payment.id ? { ...p, amount: parseFloat(e.target.value) || 0 } : p))}
                                                    className="h-8 flex-1 text-sm"
                                                />

                                                {/* Bank account (if online) */}
                                                {payment.method === 'online' && (
                                                    <Select value={payment.bankAccountId || ''} onValueChange={(id) => setPayments(payments.map(p => p.id === payment.id ? { ...p, bankAccountId: id } : p))}>
                                                        <SelectTrigger className="h-8 w-32 text-xs">
                                                            <SelectValue placeholder="Account" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankAccounts.map((acct) => (
                                                                <SelectItem key={acct.id} value={String(acct.id)}>
                                                                    {acct.bank_name || acct.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}

                                                {/* Reference (online/check) */}
                                                {(payment.method === 'online' || payment.method === 'check') && (
                                                    <Input
                                                        placeholder="Ref #"
                                                        value={payment.reference || ''}
                                                        onChange={(e) => setPayments(payments.map(p => p.id === payment.id ? { ...p, reference: e.target.value } : p))}
                                                        className="h-8 w-20 text-sm"
                                                    />
                                                )}

                                                {/* Remove button */}
                                                {payments.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => setPayments(payments.filter(p => p.id !== payment.id))}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Balance summary */}
                                    <div className="rounded-md bg-muted/40 p-2 space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total:</span>
                                            <span className="font-bold">{formatCurrency(total)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Paid:</span>
                                            <span className={totalPaid >= total ? 'text-green-600 font-bold' : 'font-bold'}>{formatCurrency(totalPaid)}</span>
                                        </div>
                                        {remainingBalance > 0 && (
                                            <div className="flex justify-between text-amber-700">
                                                <span>Remaining:</span>
                                                <span className="font-bold">{formatCurrency(remainingBalance)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Credit reminder */}
                                    {hasMultiCredit && (
                                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200">
                                            {selectedCustomerId ? (
                                                <>Credit portion will be recorded as debt for <span className="font-semibold">{customerName}</span>.</>
                                            ) : (
                                                <>Please select a customer above to record credit sales and track their debt.</>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Button
                                className="w-full"
                                size="lg"
                                disabled={
                                    processing ||
                                    (cart.length === 0 && !(initialRepairJob && repairFeeAmount > 0)) ||
                                    (paymentMethod === 'cash' && tendered < total) ||
                                    (paymentMethod === 'online' && !bankAccountId) ||
                                    (paymentMethod === 'credit' && !selectedCustomerId) ||
                                    (hasMultiCredit && !selectedCustomerId) ||
                                    (paymentMethod === 'multi' && totalPaid < total)
                                }
                                onClick={handleSubmit}
                            >
                                {processing ? 'Processing...' : `Complete Sale - ${formatCurrency(total)}`}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                </div>
            </div>
        </AuthenticatedLayout>

        {/* Sales Command Palette */}
        <SalesCommandPalette
            open={showPalette}
            onClose={() => setShowPalette(false)}
            onPaymentMethod={setPaymentMethod}
            onClearCart={() => setCart([])}
            onRemoveLastItem={() => cart.length > 0 && removeFromCart(cart[cart.length - 1].product.id)}
            onFocusSearch={() => searchRef.current?.focus()}
            onFocusDiscount={() => document.getElementById('discount-input')?.focus()}
            onExactAmount={() => setAmountTendered(total.toFixed(2))}
            onCompleteSale={handleSubmit}
            onAddCustomer={openQuickAdd}
            onClearCustomer={clearCustomer}
            cartEmpty={cart.length === 0}
            hasCustomer={!!selectedCustomerId}
            isCash={paymentMethod === 'cash'}
        />

        {/* Repair Queue Dialog */}
        <Dialog open={showRepairQueue} onOpenChange={setShowRepairQueue}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Repairs Ready for Payment
                        <Badge className="ml-1">{repairQueue.length}</Badge>
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-1 max-h-[60vh] overflow-y-auto">
                    {repairQueue.map((job) => (
                        <button
                            key={job.id}
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-accent transition-colors"
                            onClick={() => {
                                setShowRepairQueue(false);
                                router.get(route('sales.create'), { repair_job_id: job.id });
                            }}
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold">{job.job_number}</span>
                                    <Badge variant="secondary" className="text-xs">Done</Badge>
                                </div>
                                <p className="mt-0.5 text-sm font-medium truncate">{job.customer_name}</p>
                                {job.customer_phone && (
                                    <p className="text-xs text-muted-foreground">{job.customer_phone}</p>
                                )}
                            </div>
                            <div className="ml-3 text-right shrink-0">
                                {job.repair_fee != null && (
                                    <p className="text-sm font-semibold text-green-600">{formatCurrency(job.repair_fee)}</p>
                                )}
                                <ShoppingCart className="ml-auto mt-1 h-4 w-4 text-muted-foreground" />
                            </div>
                        </button>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRepairQueue(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Quick-Add Customer Dialog */}
        <Dialog open={showQuickAdd} onOpenChange={(open) => { if (!open) setShowQuickAdd(false); }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" /> New Customer
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-1">
                    <div className="space-y-1">
                        <Label htmlFor="qa-name">Name *</Label>
                        <Input
                            id="qa-name"
                            value={quickName}
                            onChange={(e) => setQuickName(e.target.value)}
                            placeholder="Full name"
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddSubmit(); } }}
                            autoFocus
                        />
                        {quickErrors.name && <p className="text-xs text-destructive">{quickErrors.name}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="qa-phone">Phone</Label>
                        <Input
                            id="qa-phone"
                            value={quickPhone}
                            onChange={(e) => setQuickPhone(e.target.value)}
                            placeholder="09XXXXXXXXX"
                            type="tel"
                        />
                        {quickErrors.phone && <p className="text-xs text-destructive">{quickErrors.phone}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="qa-email">Email</Label>
                        <Input
                            id="qa-email"
                            value={quickEmail}
                            onChange={(e) => setQuickEmail(e.target.value)}
                            placeholder="optional@email.com"
                            type="email"
                        />
                        {quickErrors.email && <p className="text-xs text-destructive">{quickErrors.email}</p>}
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowQuickAdd(false)} disabled={quickLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleQuickAddSubmit} disabled={quickLoading || !quickName.trim()}>
                        {quickLoading ? 'Saving…' : 'Add Customer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Receipt Modal */}
        {completedSale && (
            <Dialog open={showReceiptModal} onOpenChange={(open) => { if (!open) handleCloseReceipt(); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Sale Complete</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                        <ReceiptPrinter sale={completedSale} />
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" className="w-full" onClick={handleCloseReceipt}>
                            New Sale
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        </>
    );
}
