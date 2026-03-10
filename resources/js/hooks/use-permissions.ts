import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

export function usePermission() {
    const { auth } = usePage<PageProps>().props;

    const can = (permission: string): boolean => {
        if (auth.user?.is_admin) return true;
        return auth.user?.permissions?.includes(permission) ?? false;
    };

    return { can };
}
