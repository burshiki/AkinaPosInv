import { Sidebar } from '@/Components/app/sidebar';
import { Header } from '@/Components/app/header';
import { CommandPalette } from '@/Components/app/command-palette';
import { Toaster } from '@/Components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { PageProps } from '@/types';
import type { PropsWithChildren, ReactNode } from 'react';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: string | ReactNode }>) {
    const { flash } = usePage<PageProps>().props;

    useEffect(() => {
        if (flash.success) toast({ title: flash.success, variant: 'success' });
        if (flash.error)   toast({ title: flash.error,   variant: 'error' });
    }, [flash]);

    const headerTitle = typeof header === 'string' ? header : undefined;
    const headerContent = typeof header !== 'string' ? header : undefined;

    return (
        <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
            <Sidebar className="print:hidden" />
            <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
                <div className="print:hidden"><Header title={headerTitle}>{headerContent}</Header></div>
                <main className="flex-1 overflow-auto p-6 print:p-0 print:overflow-visible">{children}</main>
            </div>
            <div className="print:hidden"><Toaster /></div>
            <CommandPalette />
        </div>
    );
}
