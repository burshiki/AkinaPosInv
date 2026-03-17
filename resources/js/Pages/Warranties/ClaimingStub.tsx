import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import type { WarrantyClaim } from '@/types';

interface Props {
    claim:   WarrantyClaim;
    appName: string;
}

export default function ClaimingStub({ claim, appName }: Props) {
    const warranty = (claim as any).warranty as {
        product?: { name: string };
        customer_name?: string;
        serial_number?: string;
        receipt_number?: string;
    };

    useEffect(() => {
        window.print();
    }, []);

    return (
        <>
            <Head title={`Claiming Stub — ${claim.claim_number}`} />

            {/* Print-only styles */}
            <style>{`
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
                @page { size: A5; margin: 12mm; }
            `}</style>

            {/* Screen: close button */}
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

            {/* Stub body */}
            <div
                className="mx-auto bg-white text-black"
                style={{ width: '148mm', minHeight: '210mm', padding: '12mm', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
            >
                {/* Store header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '12px' }}>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{appName}</p>
                    <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>Warranty Replacement Claiming Stub</p>
                </div>

                {/* Claim details */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                        <Row label="Claim No."      value={claim.claim_number} mono />
                        <Row label="Date Issued"    value={formatDate(claim.created_at)} />
                        <Row label="Customer"       value={warranty.customer_name ?? '—'} />
                        <Row label="Product"        value={warranty.product?.name ?? '—'} />
                        <Row label="Receipt No."    value={warranty.receipt_number ?? '—'} mono />
                        <Row label="Serial No."     value={warranty.serial_number ?? 'Not recorded'} mono />
                        <Row label="Resolution"     value="Replacement" />
                        {claim.issue_description && (
                            <Row label="Issue"      value={claim.issue_description} />
                        )}
                        {claim.supplier && (
                            <Row label="Sent to"    value={(claim.supplier as any).name} />
                        )}
                        {claim.tracking_number && (
                            <Row label="Tracking #" value={claim.tracking_number} mono />
                        )}
                    </tbody>
                </table>

                {/* Notice box */}
                <div style={{ border: '1px solid black', borderRadius: '4px', padding: '10px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>Important Notice</p>
                    <p style={{ margin: 0, lineHeight: '1.5' }}>
                        Please present this stub when claiming your replacement unit. This stub serves as proof that your item
                        has been sent to the supplier for replacement. You will be notified once your replacement unit is ready for pick-up.
                    </p>
                </div>

                {/* Signature lines */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                    <SignatureLine label="Issued by (Staff)" />
                    <SignatureLine label="Received by (Customer)" />
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #ccc', paddingTop: '8px', marginTop: '24px', textAlign: 'center', color: '#888', fontSize: '10px' }}>
                    <p style={{ margin: 0 }}>{appName} — Warranty Claim #{claim.claim_number} — Printed {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </>
    );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <tr>
            <td style={{ padding: '4px 0', color: '#555', width: '35%', verticalAlign: 'top' }}>{label}</td>
            <td style={{ padding: '4px 0', width: '5%', verticalAlign: 'top' }}>:</td>
            <td style={{ padding: '4px 0', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: mono ? 'bold' : 'normal', verticalAlign: 'top' }}>{value}</td>
        </tr>
    );
}

function SignatureLine({ label }: { label: string }) {
    return (
        <div style={{ width: '44%', textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid black', height: '40px', marginBottom: '6px' }} />
            <p style={{ margin: 0, fontSize: '11px', color: '#555' }}>{label}</p>
        </div>
    );
}
