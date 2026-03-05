import { usePermission } from '@/hooks/use-permissions';
import type { PropsWithChildren, ReactNode } from 'react';

interface PermissionGateProps extends PropsWithChildren {
    permission: string;
    fallback?: ReactNode;
}

export function PermissionGate({
    permission,
    children,
    fallback = null,
}: PermissionGateProps) {
    const { can } = usePermission();
    return can(permission) ? <>{children}</> : <>{fallback}</>;
}
