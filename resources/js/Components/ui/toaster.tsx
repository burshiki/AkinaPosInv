import { useToast, dismissToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

const variantStyles: Record<string, string> = {
    default: 'bg-background border text-foreground',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
    error:   'bg-red-50 border-red-200 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
};

const VariantIcon = ({ variant }: { variant?: string }) => {
    switch (variant) {
        case 'success': return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />;
        case 'error':   return <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />;
        default:        return <Info className="h-4 w-4 shrink-0 text-foreground/60" />;
    }
};

export function Toaster() {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={cn(
                        'flex items-start gap-3 rounded-lg border p-4 shadow-lg',
                        'animate-in slide-in-from-bottom-2 fade-in-0 duration-300',
                        variantStyles[t.variant ?? 'default']
                    )}
                >
                    <VariantIcon variant={t.variant} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{t.title}</p>
                        {t.description && (
                            <p className="mt-1 text-xs opacity-80">{t.description}</p>
                        )}
                    </div>
                    <button
                        onClick={() => dismissToast(t.id)}
                        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
