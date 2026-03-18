import { formatCurrency, formatDate } from '@/lib/utils';
import { Separator } from '@/Components/ui/separator';
import { Button } from '@/Components/ui/button';
import { Printer } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import type { Sale, PageProps } from '@/types';

interface ReceiptPrinterProps {
    sale: Sale;
    storeName?: string;
}

export function ReceiptPrinter({ sale, storeName = 'Akina POS' }: ReceiptPrinterProps) {
    const { receipt_note } = usePage<PageProps>().props;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const receiptHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.receipt_number}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 280px; margin: 0 auto; padding: 10px; font-size: 12px; }
                    .center { text-align: center; }
                    .right { text-align: right; }
                    .bold { font-weight: bold; }
                    .line { border-top: 1px dashed #000; margin: 5px 0; }
                    .note { text-align: center; font-size: 11px; margin-top: 4px; white-space: pre-wrap; }
                    table { width: 100%; border-collapse: collapse; }
                    td { padding: 2px 0; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="center bold">${storeName}</div>
                <div class="line"></div>
                <div>Receipt: ${sale.receipt_number}</div>
                <div>Date: ${formatDate(sale.sold_at)}</div>
                <div>Cashier: ${sale.user?.name ?? 'N/A'}</div>
                ${sale.customer_name ? `<div>Customer: ${sale.customer_name}</div>` : ''}
                <div class="line"></div>
                <table>
                    ${sale.items?.map(item => `
                        <tr>
                            <td>${item.product_name}</td>
                            <td class="right">${item.quantity}x ${formatCurrency(item.unit_price)}</td>
                        </tr>
                        <tr>
                            <td></td>
                            <td class="right bold">${formatCurrency(item.subtotal)}</td>
                        </tr>
                    `).join('') ?? ''}
                </table>
                <div class="line"></div>
                <table>
                    <tr><td>Subtotal:</td><td class="right">${formatCurrency(sale.subtotal)}</td></tr>
                    ${sale.discount_amount > 0 ? `<tr><td>Discount:</td><td class="right">-${formatCurrency(sale.discount_amount)}</td></tr>` : ''}
                    <tr class="bold"><td>TOTAL:</td><td class="right">${formatCurrency(sale.total)}</td></tr>
                </table>
                <div class="line"></div>
                <div>Payment: ${sale.payment_method.toUpperCase()}</div>
                ${sale.amount_tendered ? `<div>Tendered: ${formatCurrency(sale.amount_tendered)}</div>` : ''}
                ${sale.change_amount ? `<div>Change: ${formatCurrency(sale.change_amount)}</div>` : ''}
                <div class="line"></div>
                <div class="center">Thank you for your purchase!</div>
                ${receipt_note ? `<div class="line"></div><div class="note">${receipt_note}</div>` : ''}
            </body>
            </html>
        `;

        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };

    return (
        <div>
            <div className="space-y-4 rounded-lg border p-4 font-mono text-sm">
                <div className="text-center font-bold text-lg">{storeName}</div>
                <Separator />
                <div className="space-y-1">
                    <div>Receipt: {sale.receipt_number}</div>
                    <div>Date: {formatDate(sale.sold_at)}</div>
                    <div>Cashier: {sale.user?.name ?? 'N/A'}</div>
                    {sale.customer_name && <div>Customer: {sale.customer_name}</div>}
                </div>
                <Separator />
                <div className="space-y-2">
                    {sale.items?.map((item) => (
                        <div key={item.id} className="flex justify-between">
                            <div>
                                <div>{item.product_name}</div>
                                <div className="text-muted-foreground">
                                    {item.quantity} x {formatCurrency(item.unit_price)}
                                </div>
                            </div>
                            <div className="font-medium">{formatCurrency(item.subtotal)}</div>
                        </div>
                    ))}
                </div>
                <Separator />
                <div className="space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(sale.subtotal)}</span>
                    </div>
                    {sale.discount_amount > 0 && (
                        <div className="flex justify-between text-destructive">
                            <span>Discount:</span>
                            <span>-{formatCurrency(sale.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-base">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(sale.total)}</span>
                    </div>
                </div>
                <Separator />
                <div className="space-y-1">
                    <div>Payment: {sale.payment_method.toUpperCase()}</div>
                    {sale.amount_tendered != null && (
                        <div>Tendered: {formatCurrency(sale.amount_tendered)}</div>
                    )}
                    {sale.change_amount != null && sale.change_amount > 0 && (
                        <div>Change: {formatCurrency(sale.change_amount)}</div>
                    )}
                </div>
                {receipt_note && (
                    <>
                        <Separator />
                        <div className="text-center text-xs text-muted-foreground whitespace-pre-wrap">{receipt_note}</div>
                    </>
                )}
            </div>
            <Button onClick={handlePrint} variant="outline" className="mt-4 w-full">
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
            </Button>
        </div>
    );
}
