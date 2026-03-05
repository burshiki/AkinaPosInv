import * as React from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function notify() {
    listeners.forEach((fn) => fn([...toasts]));
}

export function toast(options: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    const duration = options.duration ?? 4000;
    toasts = [...toasts, { ...options, id }];
    notify();
    if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
    }
}

export function dismissToast(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
}

export function useToast() {
    const [list, setList] = React.useState<Toast[]>([...toasts]);

    React.useEffect(() => {
        const fn: Listener = (updated) => setList(updated);
        listeners.add(fn);
        return () => {
            listeners.delete(fn);
        };
    }, []);

    return { toasts: list, toast, dismiss: dismissToast };
}
