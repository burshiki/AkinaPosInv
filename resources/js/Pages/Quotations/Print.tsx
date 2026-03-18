import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Quotation } from '@/types';

interface Props {
    quotation: Quotation;
    appName:   string;
}

export default function QuotationPrint({ quotation, appName }: Props) {
    const discountValue = quotation.discount_type === 'percentage'
        ? quotation.subtotal * (quotation.discount_amount / 100)
        : quotation.discount_amount;

    useEffect(() => {
        window.print();
    }, []);

    return (
        <>
            <Head title={`Quotation ${quotation.quotation_number}`} />
            <style>{`
                @media print { .no-print { display: none !important; } body { margin: 0; } }
                @page { size: A4; margin: 15mm; }
                body { font-family: Arial, sans-serif; background: #fff; }
            `}</style>

            {/* Floating controls — hidden when printing */}
            <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 text-white rounded-md text-sm hover:bg-slate-700"
                >
                    Print
                </button>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                >
                    Close
                </button>
            </div>

            <div style={{ maxWidth: '180mm', margin: '0 auto', padding: '0', backgroundColor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #1e293b', paddingBottom: '12px', marginBottom: '20px' }}>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{appName}</p>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>QUOTATION</p>
                        <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '13px' }}>{quotation.quotation_number}</p>
                        <p style={{ margin: '2px 0 0', color: '#666', fontSize: '11px' }}>Date: {formatDate(quotation.created_at)}</p>
                        {quotation.valid_until && (
                            <p style={{ margin: '2px 0 0', color: '#666', fontSize: '11px' }}>Valid until: {formatDate(quotation.valid_until)}</p>
                        )}
                    </div>
                </div>

                {/* Bill To */}
                {(quotation.customer_name || quotation.customer_email || quotation.customer_phone) && (
                    <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888', margin: '0 0 6px' }}>Bill To</p>
                        {quotation.customer_name  && <p style={{ margin: '2px 0', fontWeight: 'bold', fontSize: '13px' }}>{quotation.customer_name}</p>}
                        {quotation.customer_email && <p style={{ margin: '2px 0', color: '#555' }}>{quotation.customer_email}</p>}
                        {quotation.customer_phone && <p style={{ margin: '2px 0', color: '#555' }}>{quotation.customer_phone}</p>}
                    </div>
                )}

                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1e293b', color: 'white' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left',  fontSize: '11px' }}>Item</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left',  fontSize: '11px', width: '80px' }}>SKU</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', width: '50px' }}>Qty</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', width: '90px' }}>Unit Price</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', width: '90px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotation.items?.map((item, i) => (
                            <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0' }}>{item.product_name}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', color: '#888', fontFamily: 'monospace', fontSize: '10px' }}>{item.product_sku ?? '—'}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                    <table style={{ width: '220px', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', color: '#555' }}>Subtotal</td>
                                <td style={{ padding: '4px 0', textAlign: 'right' }}>{formatCurrency(quotation.subtotal)}</td>
                            </tr>
                            {discountValue > 0 && (
                                <tr>
                                    <td style={{ padding: '4px 0', color: '#555' }}>
                                        Discount{quotation.discount_type === 'percentage' ? ` (${quotation.discount_amount}%)` : ''}
                                    </td>
                                    <td style={{ padding: '4px 0', textAlign: 'right', color: '#dc2626' }}>-{formatCurrency(discountValue)}</td>
                                </tr>
                            )}
                            <tr style={{ borderTop: '2px solid #1e293b' }}>
                                <td style={{ padding: '6px 0', fontWeight: 'bold', fontSize: '14px' }}>TOTAL</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(quotation.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Notes */}
                {quotation.notes && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px 14px', marginBottom: '20px', backgroundColor: '#f8fafc' }}>
                        <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888' }}>Notes</p>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{quotation.notes}</p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', textAlign: 'center', color: '#aaa', fontSize: '10px' }}>
                    <p style={{ margin: 0 }}>{appName} · Quotation {quotation.quotation_number} · Printed {new Date().toLocaleDateString()}</p>
                    <p style={{ margin: '2px 0 0', fontStyle: 'italic' }}>This quotation is not a receipt or an official document.</p>
                </div>
            </div>
        </>
    );
}
