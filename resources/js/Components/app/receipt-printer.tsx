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
                    @page { size: A4 portrait; margin: 15mm; }
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; margin: 0; }

                    /* Header */
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                    .header .store-name { font-size: 16pt; font-weight: bold; margin: 0; }
                    .header .receipt-title { font-size: 9pt; margin: 2px 0 0; }

                    /* Info row: left=receipt details, right=payment summary */
                    .info-row { display: flex; justify-content: space-between; gap: 20mm; margin-bottom: 12px; }
                    .info-block { flex: 1; }
                    .info-block table { width: 100%; border-collapse: collapse; }
                    .info-block td { padding: 2px 4px; vertical-align: top; }
                    .info-block td:first-child { color: #555; width: 38%; }

                    /* Items table */
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    .items-table th { background: #1e293b; color: #fff; padding: 5px 8px; text-align: left; font-size: 8pt; }
                    .items-table th.right { text-align: right; }
                    .items-table td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                    .items-table td.right { text-align: right; }
                    .items-table tr:nth-child(even) td { background: #f9fafb; }

                    /* Totals */
                    .totals-row { display: flex; justify-content: flex-end; margin-bottom: 12px; }
                    .totals-table { width: 260px; border-collapse: collapse; }
                    .totals-table td { padding: 3px 8px; }
                    .totals-table td:last-child { text-align: right; }
                    .totals-table .total-line td { font-weight: bold; font-size: 11pt; border-top: 2px solid #000; padding-top: 5px; }

                    /* Payment & footer */
                    .payment-row { border-top: 1px solid #ccc; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .payment-block table { border-collapse: collapse; }
                    .payment-block td { padding: 2px 6px; }
                    .payment-block td:first-child { color: #555; }
                    .thank-you { text-align: right; font-weight: bold; font-size: 9pt; }
                    .note { text-align: center; margin-top: 10px; font-size: 8pt; color: #555; white-space: pre-wrap; border-top: 1px dashed #aaa; padding-top: 6px; }

                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <!-- Header -->
                <div class="header">
                    <div class="store-name">${storeName}</div>
                    <div class="receipt-title">OFFICIAL RECEIPT</div>
                </div>

                <!-- Receipt info + Payment info -->
                <div class="info-row">
                    <div class="info-block">
                        <table>
                            <tr><td>Receipt No.</td><td><strong>${sale.receipt_number}</strong></td></tr>
                            <tr><td>Date</td><td>${formatDate(sale.sold_at)}</td></tr>
                            <tr><td>Cashier</td><td>${sale.user?.name ?? 'N/A'}</td></tr>
                            ${sale.customer_name ? `<tr><td>Customer</td><td>${sale.customer_name}</td></tr>` : ''}
                        </table>
                    </div>
                    <div class="info-block" style="text-align:right;">
                        <div style="font-size:9pt;color:#555;">Payment Method</div>
                        <div style="font-size:11pt;font-weight:bold;">${sale.payment_method.toUpperCase()}</div>
                    </div>
                </div>

                <!-- Items -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width:50%">Item</th>
                            <th class="right" style="width:12%">Qty</th>
                            <th class="right" style="width:19%">Unit Price</th>
                            <th class="right" style="width:19%">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items?.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td class="right">${item.quantity}</td>
                                <td class="right">${formatCurrency(item.unit_price)}</td>
                                <td class="right">${formatCurrency(item.subtotal)}</td>
                            </tr>
                        `).join('') ?? '<tr><td colspan="4" style="text-align:center;color:#999;">No items</td></tr>'}
                    </tbody>
                </table>

                <!-- Totals -->
                <div class="totals-row">
                    <table class="totals-table">
                        <tr><td>Subtotal</td><td>${formatCurrency(sale.subtotal)}</td></tr>
                        ${sale.discount_amount > 0 ? `<tr><td style="color:#c00;">Discount</td><td style="color:#c00;">-${formatCurrency(sale.discount_amount)}</td></tr>` : ''}
                        <tr class="total-line"><td>TOTAL</td><td>${formatCurrency(sale.total)}</td></tr>
                    </table>
                </div>

                <!-- Payment details + Thank you -->
                <div class="payment-row">
                    <div class="payment-block">
                        <table>
                            ${sale.amount_tendered ? `<tr><td>Amount Tendered</td><td>${formatCurrency(sale.amount_tendered)}</td></tr>` : ''}
                            ${sale.change_amount ? `<tr><td>Change</td><td>${formatCurrency(sale.change_amount)}</td></tr>` : ''}
                        </table>
                    </div>
                    <div class="thank-you">Thank you for your purchase!</div>
                </div>

                ${receipt_note ? `<div class="note">${receipt_note}</div>` : ''}
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
