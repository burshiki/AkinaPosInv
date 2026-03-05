import { Command } from 'cmdk';
import {
    CreditCard,
    DollarSign,
    Search,
    ShoppingCart,
    Trash2,
    UserPlus,
    UserX,
    Wifi,
    X,
    Crosshair,
    Tag,
    CheckCircle,
} from 'lucide-react';

interface Props {
    open: boolean;
    onClose: () => void;
    onPaymentMethod: (m: 'cash' | 'online' | 'credit') => void;
    onClearCart: () => void;
    onRemoveLastItem: () => void;
    onFocusSearch: () => void;
    onFocusDiscount: () => void;
    onExactAmount: () => void;
    onCompleteSale: () => void;
    onAddCustomer: () => void;
    onClearCustomer: () => void;
    cartEmpty: boolean;
    hasCustomer: boolean;
    isCash: boolean;
}

interface CommandItem {
    id: string;
    label: string;
    group: string;
    icon: React.ElementType;
    action: () => void;
    keywords?: string[];
    disabled?: boolean;
}

export function SalesCommandPalette({
    open,
    onClose,
    onPaymentMethod,
    onClearCart,
    onRemoveLastItem,
    onFocusSearch,
    onFocusDiscount,
    onExactAmount,
    onCompleteSale,
    onAddCustomer,
    onClearCustomer,
    cartEmpty,
    hasCustomer,
    isCash,
}: Props) {
    const run = (fn: () => void) => {
        fn();
        onClose();
    };

    const items: CommandItem[] = [
        // Payment
        { id: 'pay-cash',   label: 'Switch to Cash',   group: 'Payment', icon: DollarSign,  action: () => run(() => onPaymentMethod('cash')),   keywords: ['f1', 'cash payment'] },
        { id: 'pay-online', label: 'Switch to Online',  group: 'Payment', icon: Wifi,         action: () => run(() => onPaymentMethod('online')), keywords: ['f2', 'gcash', 'bank transfer', 'online payment'] },
        { id: 'pay-credit', label: 'Switch to Credit',  group: 'Payment', icon: CreditCard,   action: () => run(() => onPaymentMethod('credit')), keywords: ['f3', 'credit sale', 'utang'] },

        // Cart
        { id: 'clear-cart',       label: 'Clear Cart',        group: 'Cart', icon: Trash2,       action: () => run(onClearCart),       keywords: ['empty cart', 'reset'], disabled: cartEmpty },
        { id: 'remove-last',      label: 'Remove Last Item',   group: 'Cart', icon: X,            action: () => run(onRemoveLastItem),  keywords: ['delete last', 'undo add'],  disabled: cartEmpty },

        // Inputs
        { id: 'focus-search',   label: 'Focus Product Search', group: 'Input', icon: Search,     action: () => run(onFocusSearch),   keywords: ['barcode', 'scan', 'find product'] },
        { id: 'focus-discount', label: 'Apply Discount',        group: 'Input', icon: Tag,        action: () => run(onFocusDiscount), keywords: ['f4', 'discount', 'promo'] },
        { id: 'exact-amount',   label: 'Set Exact Cash Amount', group: 'Input', icon: Crosshair,  action: () => run(onExactAmount),   keywords: ['tendered', 'exact', 'no change'], disabled: !isCash },

        // Sale
        { id: 'complete-sale',   label: 'Complete Sale',    group: 'Sale', icon: CheckCircle, action: () => run(onCompleteSale),  keywords: ['submit', 'checkout', 'enter', 'finish'], disabled: cartEmpty },
        { id: 'add-customer',    label: 'Add New Customer', group: 'Sale', icon: UserPlus,    action: () => run(onAddCustomer),   keywords: ['quick add', 'new customer'] },
        { id: 'clear-customer',  label: 'Clear Customer',   group: 'Sale', icon: UserX,       action: () => run(onClearCustomer), keywords: ['remove customer', 'walk-in'], disabled: !hasCustomer },
    ];

    const groups = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
    }, {});

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            {/* Dialog */}
            <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
                <Command
                    className="rounded-lg border bg-popover text-popover-foreground shadow-md"
                    loop
                >
                    <div className="flex items-center border-b px-3">
                        <ShoppingCart className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Command.Input
                            placeholder="POS command..."
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            autoFocus
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No commands found.
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
                                        onSelect={() => !item.disabled && item.action()}
                                        disabled={item.disabled}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
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
