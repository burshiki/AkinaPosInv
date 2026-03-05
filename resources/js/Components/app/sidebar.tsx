import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permissions';
import { ScrollArea } from '@/Components/ui/scroll-area';
import {
    LayoutDashboard,
    Package,
    Tags,
    Puzzle,
    ShoppingCart,
    Landmark,
    BarChart3,
    Users,
    UserRound,
    ShoppingBag,
    Truck,
    DollarSign,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Boxes,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import type { PageProps } from '@/types';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    permission?: string;
    active?: string;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view', active: 'dashboard' },
    { label: 'Products', href: '/products', icon: Package, permission: 'inventory.view', active: 'products.*' },
    { label: 'Categories', href: '/categories', icon: Tags, permission: 'inventory.view', active: 'categories.*' },
    { label: 'Assemblies', href: '/assemblies', icon: Puzzle, permission: 'inventory.build', active: 'assemblies.*' },
    { label: 'Point of Sale', href: '/sales/create', icon: ShoppingCart, permission: 'sales.create', active: 'sales.create' },
    { label: 'Sales History', href: '/sales', icon: ShoppingCart, permission: 'sales.view', active: 'sales.index' },
    { label: 'Cash Drawer', href: '/cash-drawer', icon: DollarSign, permission: 'sales.view', active: 'cash-drawer.*' },
    { label: 'Bank Accounts', href: '/bank-accounts', icon: Landmark, permission: 'banking.view', active: 'bank-accounts.*' },
    { label: 'Customers', href: '/customers', icon: UserRound, permission: 'customers.view', active: 'customers.*' },
    { label: 'Suppliers', href: '/suppliers', icon: Truck, permission: 'suppliers.view', active: 'suppliers.*' },
    { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingBag, permission: 'purchasing.view', active: 'purchase-orders.*' },
    { label: 'Warranties', href: '/warranties', icon: ShieldCheck, permission: 'warranties.view', active: 'warranties.*' },
    { label: 'Stock', href: '/stock', icon: Boxes, permission: 'stock.view', active: 'stock.*' },
    { label: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports.view', active: 'reports.*' },
    { label: 'Users', href: '/users', icon: Users, permission: 'users.view', active: 'users.*' },
];

interface SidebarProps {
    className?: string;
}

export function Sidebar({ className }: SidebarProps) {
    const { can } = usePermission();
    const { warrantyPendingCount, poPendingApprovalCount } = usePage<PageProps>().props;
    const [collapsed, setCollapsed] = useState(false);

    const isActive = (pattern?: string): boolean => {
        if (!pattern) return false;
        try {
            return route().current(pattern) ?? false;
        } catch {
            return false;
        }
    };

    const filteredItems = navItems.filter(
        (item) => !item.permission || can(item.permission)
    );

    return (
        <aside
            className={cn(
                'flex flex-col border-r bg-card transition-all duration-300',
                collapsed ? 'w-16' : 'w-64',
                className
            )}
        >
            <div className="flex h-16 items-center justify-between border-b px-4">
                {!collapsed && (
                    <Link href="/dashboard" className="text-lg font-bold">
                        Akina POS
                    </Link>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="h-8 w-8"
                >
                    {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <nav className="space-y-1 p-2">
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.active);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    collapsed && 'justify-center px-2'
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <div className="relative shrink-0">
                                    <Icon className="h-5 w-5" />
                                    {item.href === '/warranties' && warrantyPendingCount > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                            {warrantyPendingCount > 99 ? '99+' : warrantyPendingCount}
                                        </span>
                                    )}
                                    {item.href === '/purchase-orders' && poPendingApprovalCount > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                                            {poPendingApprovalCount > 99 ? '99+' : poPendingApprovalCount}
                                        </span>
                                    )}
                                </div>
                                {!collapsed && <span className="flex-1">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>
        </aside>
    );
}
