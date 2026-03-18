import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import type { WarrantyClaim } from '@/types';

interface Props {
    claim:          WarrantyClaim;
    appName:        string;
    isDefectiveSend?: boolean;
}

export default function SupplierSheet({ claim, appName, isDefectiveSend = false }: Props) {
    const warranty = (claim as any).warranty as {
        product?: { name: string };
        customer_name?: string;
        serial_number?: string;
        receipt_number?: string;
        warranty_months?: number;
        purchased_at?: string;
        expires_at?: string;
    };

    const activeSupplier = isDefectiveSend
        ? (claim as any).defective_supplier as { name: string } | null
        : (claim as any).supplier as { name: string } | null;

    const activeTracking = isDefectiveSend
        ? (claim as any).defective_tracking_number as string | undefined
        : claim.tracking_number;

    const sheetSubtitle = isDefectiveSend
        ? 'DEFECTIVE UNIT RETURN — SUPPLIER REFERENCE SHEET'
        : 'WARRANTY CLAIM — SUPPLIER REFERENCE SHEET';

    const resolution = isDefectiveSend
        ? 'Defective Return'
        : claim.resolution_type
            ? claim.resolution_type.charAt(0).toUpperCase() + claim.resolution_type.slice(1)
            : '—';

    useEffect(() => {
        window.print();
    }, []);

    return (
        <>
            <Head title={`Supplier Sheet — ${claim.claim_number}`} />

            <style>{`
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
                @page { size: A4; margin: 15mm; }
            `}</style>

            {/* Screen controls */}
            <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
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

            {/* Sheet body */}
            <div
                className="mx-auto bg-white text-black"
                style={{ maxWidth: '180mm', minHeight: '260mm', padding: '0', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '2.5px solid black', paddingBottom: '10px', marginBottom: '16px' }}>
                    <p style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>{appName}</p>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '4px 0 0' }}>{sheetSubtitle}</p>
                </div>

                {/* Reference box */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
                    <InfoBox label="Claim No." value={claim.claim_number} mono large />
                    <InfoBox label="Date Sent"  value={formatDate(claim.updated_at ?? claim.created_at)} />
                    <InfoBox label="Type" value={resolution} />
                </div>

                {/* Section: Product & Warranty */}
                <SectionTitle>Product &amp; Warranty Information</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                    <tbody>
                        <Row label="Product"        value={warranty.product?.name ?? '—'} />
                        <Row label="Serial Number"  value={warranty.serial_number ?? 'Not recorded'} mono />
                        <Row label="Receipt No."    value={warranty.receipt_number ?? '—'} mono />
                        <Row label="Warranty"       value={warranty.warranty_months ? `${warranty.warranty_months} months` : '—'} />
                        {warranty.purchased_at && (
                            <Row label="Date Purchased" value={formatDate(warranty.purchased_at)} />
                        )}
                        {warranty.expires_at && (
                            <Row label="Warranty Expiry" value={formatDate(warranty.expires_at)} />
                        )}
                    </tbody>
                </table>

                {/* Section: Claim Details */}
                <SectionTitle>Claim Details</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
                    <tbody>
                        <Row label="Claim No."      value={claim.claim_number} mono />
                        <Row label="Date Filed"     value={formatDate(claim.created_at)} />
                        <Row label="Status"         value={isDefectiveSend ? 'Defective Unit Sent to Supplier' : 'Sent to Supplier'} />
                        {activeSupplier && (
                            <Row label="Supplier / ASC" value={activeSupplier.name} />
                        )}
                        {activeTracking && (
                            <Row label="Tracking No."   value={activeTracking} mono />
                        )}
                        {warranty.customer_name && (
                            <Row label="Customer"       value={warranty.customer_name} />
                        )}
                    </tbody>
                </table>

                {/* Section: Issue Description */}
                <SectionTitle>Reported Issue / Reason for Claim</SectionTitle>
                <div style={{
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    minHeight: '64px',
                    marginBottom: '18px',
                    lineHeight: '1.6',
                    backgroundColor: '#fafafa',
                    whiteSpace: 'pre-wrap',
                }}>
                    {claim.issue_description ?? <span style={{ color: '#999' }}>No issue description provided.</span>}
                </div>

                {/* Instructions to supplier */}
                <SectionTitle>Instructions to Supplier</SectionTitle>
                <div style={{
                    border: '1px solid #333',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    marginBottom: '24px',
                    lineHeight: '1.6',
                    backgroundColor: '#f0f4ff',
                }}>
                    {isDefectiveSend ? (
                        <p style={{ margin: 0 }}>
                            The enclosed item is a <strong>defective unit</strong> that was replaced from our
                            store inventory for the customer. We are returning it to you under warranty for
                            credit or replacement stock. Please acknowledge receipt and advise on the
                            replacement/credit arrangement at your earliest convenience.
                        </p>
                    ) : (
                        <p style={{ margin: 0 }}>
                            Please {claim.resolution_type === 'replacement' ? 'replace' : 'repair'} the above item in
                            accordance with the warranty terms. Once completed, kindly provide an updated tracking
                            number or service report. Return the item to <strong>{appName}</strong> at the earliest
                            convenience.
                        </p>
                    )}
                </div>

                {/* Signature lines */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px' }}>
                    <SignatureLine label="Released by (Staff)" />
                    <SignatureLine label="Received by (Supplier / Courier)" />
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', marginTop: '28px', textAlign: 'center', color: '#888', fontSize: '10px' }}>
                    <p style={{ margin: 0 }}>
                        {appName} — Warranty Claim #{claim.claim_number} — Printed {new Date().toLocaleDateString()}
                    </p>
                    <p style={{ margin: '2px 0 0', fontStyle: 'italic' }}>
                        This document is for supplier/service centre reference only and is not a customer receipt.
                    </p>
                </div>
            </div>
        </>
    );
}

/* ── Helpers ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            backgroundColor: '#1e293b',
            color: 'white',
            padding: '4px 10px',
            fontWeight: 'bold',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            borderRadius: '2px',
        }}>
            {children}
        </div>
    );
}

function InfoBox({ label, value, mono, large }: { label: string; value: string; mono?: boolean; large?: boolean }) {
    return (
        <div style={{ border: '1px solid #333', borderRadius: '4px', padding: '8px 12px', flex: 1, backgroundColor: '#fafafa' }}>
            <p style={{ margin: 0, fontSize: '9px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <p style={{
                margin: '2px 0 0',
                fontFamily: mono ? 'monospace' : 'inherit',
                fontWeight: 'bold',
                fontSize: large ? '16px' : '13px',
            }}>{value}</p>
        </div>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <tr style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '5px 0', color: '#555', width: '35%', verticalAlign: 'top' }}>{label}</td>
            <td style={{ padding: '5px 0', width: '4%',  verticalAlign: 'top', color: '#555' }}>:</td>
            <td style={{ padding: '5px 0', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: mono ? 'bold' : 'normal', verticalAlign: 'top' }}>{value}</td>
        </tr>
    );
}

function SignatureLine({ label }: { label: string }) {
    return (
        <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid black', height: '48px', marginBottom: '6px' }} />
            <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{label}</p>
        </div>
    );
}
