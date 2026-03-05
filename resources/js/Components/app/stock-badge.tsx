import { Badge } from '@/Components/ui/badge';
import { cn } from '@/lib/utils';

interface StockBadgeProps {
    quantity: number;
    threshold: number;
    className?: string;
}

export function StockBadge({ quantity, threshold, className }: StockBadgeProps) {
    if (quantity <= 0) {
        return (
            <Badge variant="destructive" className={cn(className)}>
                Out of Stock
            </Badge>
        );
    }

    if (quantity <= threshold) {
        return (
            <Badge variant="warning" className={cn(className)}>
                Low Stock ({quantity})
            </Badge>
        );
    }

    return (
        <Badge variant="success" className={cn(className)}>
            In Stock ({quantity})
        </Badge>
    );
}
