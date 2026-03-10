import { Link, usePage, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { PermissionGate } from '@/Components/app/permission-gate';
import { User, LogOut, Database } from 'lucide-react';
import type { PageProps } from '@/types';

interface HeaderProps {
    title?: string;
    children?: React.ReactNode;
}

export function Header({ title, children }: HeaderProps) {
    const { auth } = usePage<PageProps>().props;

    return (
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <div className="flex items-center gap-4">
                {title && <h1 className="text-xl font-semibold">{title}</h1>}
                {children}
            </div>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2">
                            <User className="h-4 w-4" />
                            <span className="hidden sm:inline">{auth.user?.name}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                            {auth.user?.name}
                            <div className="text-xs font-normal text-muted-foreground">
                                {auth.user?.email}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <PermissionGate permission="users.view">
                            <DropdownMenuItem
                                onClick={() => { window.location.href = route('backup.download'); }}
                                className="cursor-pointer"
                            >
                                <Database className="mr-2 h-4 w-4" />
                                Backup Database
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </PermissionGate>
                        <DropdownMenuItem
                            onClick={() => router.post(route('logout'))}
                            className="cursor-pointer text-destructive"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
