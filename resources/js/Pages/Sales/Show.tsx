import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { ReceiptPrinter } from '@/Components/app/receipt-printer';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { Sale } from '@/types';

interface Props {
    sale: Sale;
}

export default function SalesShow({ sale }: Props) {
    const statusVariant = (status: string) => {
        switch (status) {
            case 'completed': return 'success' as const;
            case 'voided': return 'destructive' as const;
            default: return 'secondary' as const;
        }
    };

    return (
        <AuthenticatedLayout header={`Sale: ${sale.receipt_number}`}>
            <Head title={`Sale ${sale.receipt_number}`} />

            <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('sales.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
                        </Link>
                    </Button>
                    <Badge variant={statusVariant(sale.status)} className="text-sm">
                        {sale.status.toUpperCase()}
                    </Badge>
                    {sale.status === 'completed' && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('sales.return', sale.id)}>
                                <RotateCcw className="mr-2 h-4 w-4" /> Return Items
                            </Link>
                        </Button>
                    )}
                </div>

                <ReceiptPrinter sale={sale} />
            </div>
        </AuthenticatedLayout>
    );
}
