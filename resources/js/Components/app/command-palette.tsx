import { Command } from 'cmdk';
import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import {
    BarChart3,
    Boxes,
    DollarSign,
    Landmark,
    LayoutDashboard,
    Package,
    Puzzle,
    Search,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Tags,
    Truck,
    UserRound,
    Users,
} from 'lucide-react';

interface CommandItem {
    id: string;
    label: string;
    group: string;
    icon: React.ElementType;
    action: () => void;
    keywords?: string[];
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);

    const navigate = useCallback((path: string) => {
        setOpen(false);
        router.get(path);
    }, []);

    const items: CommandItem[] = [
        // Navigation
        { id: 'dashboard', label: 'Go to Dashboard', group: 'Navigation', icon: LayoutDashboard, action: () => navigate('/dashboard'), keywords: ['home'] },
        { id: 'pos', label: 'Open Point of Sale', group: 'Navigation', icon: ShoppingCart, action: () => navigate('/sales/create'), keywords: ['pos', 'cashier', 'sell'] },
        { id: 'products', label: 'Go to Products', group: 'Navigation', icon: Package, action: () => navigate('/products'), keywords: ['inventory', 'items'] },
        { id: 'categories', label: 'Go to Categories', group: 'Navigation', icon: Tags, action: () => navigate('/categories') },
        { id: 'assemblies', label: 'Go to Assemblies', group: 'Navigation', icon: Puzzle, action: () => navigate('/assemblies'), keywords: ['build', 'manufacture'] },
        { id: 'sales', label: 'Go to Sales History', group: 'Navigation', icon: ShoppingCart, action: () => navigate('/sales'), keywords: ['transactions', 'receipts'] },
        { id: 'cash-drawer', label: 'Go to Cash Drawer', group: 'Navigation', icon: DollarSign, action: () => navigate('/cash-drawer'), keywords: ['register'] },
        { id: 'bank-accounts', label: 'Go to Bank Accounts', group: 'Navigation', icon: Landmark, action: () => navigate('/bank-accounts'), keywords: ['banking'] },
        { id: 'customers', label: 'Go to Customers', group: 'Navigation', icon: UserRound, action: () => navigate('/customers') },
        { id: 'suppliers', label: 'Go to Suppliers', group: 'Navigation', icon: Truck, action: () => navigate('/suppliers') },
        { id: 'purchase-orders', label: 'Go to Purchase Orders', group: 'Navigation', icon: ShoppingBag, action: () => navigate('/purchase-orders'), keywords: ['po'] },
        { id: 'warranties', label: 'Go to Warranties', group: 'Navigation', icon: ShieldCheck, action: () => navigate('/warranties') },
        { id: 'stock', label: 'Go to Stock', group: 'Navigation', icon: Boxes, action: () => navigate('/stock'), keywords: ['inventory'] },
        { id: 'reports', label: 'Go to Reports', group: 'Navigation', icon: BarChart3, action: () => navigate('/reports') },
        { id: 'users', label: 'Go to Users', group: 'Navigation', icon: Users, action: () => navigate('/users') },

        // Actions
        { id: 'new-sale', label: 'New Sale', group: 'Actions', icon: ShoppingCart, action: () => navigate('/sales/create'), keywords: ['create sale', 'sell'] },
        { id: 'new-product', label: 'Create Product', group: 'Actions', icon: Package, action: () => navigate('/products/create'), keywords: ['add product'] },
        { id: 'new-po', label: 'Create Purchase Order', group: 'Actions', icon: ShoppingBag, action: () => navigate('/purchase-orders/create'), keywords: ['add po', 'order'] },
        { id: 'new-customer', label: 'Create Customer', group: 'Actions', icon: UserRound, action: () => navigate('/customers/create'), keywords: ['add customer'] },

        // Reports
        { id: 'z-report', label: 'Z-Report / End of Day', group: 'Reports', icon: BarChart3, action: () => navigate('/reports/z-report'), keywords: ['eod', 'end of day', 'daily'] },
    ];

    // Group items
    const groups = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
    }, {});

    // Ctrl+K / Cmd+K toggle
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setOpen(false)}
            />
            {/* Dialog */}
            <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
                <Command
                    className="rounded-lg border bg-popover text-popover-foreground shadow-md"
                    loop
                >
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Command.Input
                            placeholder="Type a command or search..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>
                        {Object.entries(groups).map(([group, groupItems]) => (
                            <Command.Group
                                key={group}
                                heading={group}
                                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                            >
                                {groupItems.map(item => (
                                    <Command.Item
                                        key={item.id}
                                        value={[item.label, ...(item.keywords ?? [])].join(' ')}
                                        onSelect={() => item.action()}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.label}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        ))}
                    </Command.List>
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                        <span>Navigate with <kbd className="bg-muted px-1 rounded">↑↓</kbd></span>
                        <span><kbd className="bg-muted px-1 rounded">Enter</kbd> to select · <kbd className="bg-muted px-1 rounded">Esc</kbd> to close</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
