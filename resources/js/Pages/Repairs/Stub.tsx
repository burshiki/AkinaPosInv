import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import type { RepairJob } from '@/types';

interface Props {
    repair:  RepairJob & { technician: { name: string } | null };
    appName: string;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <tr>
            <td style={{ padding: '5px 8px', fontWeight: 600, width: '38%', verticalAlign: 'top', borderBottom: '1px solid #e5e7eb' }}>{label}</td>
            <td style={{ padding: '5px 8px', fontFamily: mono ? 'monospace' : undefined, verticalAlign: 'top', borderBottom: '1px solid #e5e7eb' }}>{value}</td>
        </tr>
    );
}

export default function RepairsStub({ repair, appName }: Props) {
    useEffect(() => {
        window.print();
    }, []);

    const acceptedDate = new Date(repair.accepted_at);

    return (
        <>
            <Head title={`Claim Stub — ${repair.job_number}`} />

            <style>{`
                @media print {
                    body { margin: 0; }
                    .no-print { display: none !important; }
                }
                @page { size: A5; margin: 12mm; }
            `}</style>

            {/* Screen-only buttons */}
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
                    <p style={{ fontSize: '11px', color: '#555', margin: '2px 0 0' }}>WiFi Vendo Repair — Claim Stub</p>
                </div>

                {/* Job details table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                        <Row label="Job No."        value={repair.job_number} mono />
                        <Row label="Date Accepted"  value={acceptedDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                        <Row label="Time Accepted"  value={acceptedDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} />
                        <Row label="Customer Name"  value={repair.customer_name} />
                        {repair.customer_phone && (
                            <Row label="Phone"      value={repair.customer_phone} />
                        )}
                        <Row label="Problem"        value={repair.problem_description} />
                        {repair.technician && (
                            <Row label="Technician" value={repair.technician.name} />
                        )}
                    </tbody>
                </table>

                {/* Notice box */}
                <div style={{
                    border: '1.5px solid #374151',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    marginBottom: '24px',
                    backgroundColor: '#f9fafb',
                    fontSize: '11px',
                }}>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>IMPORTANT:</p>
                    <p style={{ margin: 0 }}>
                        Please present this stub when claiming your repaired WiFi vendo unit.
                        Keep this stub safe — we may not be able to release the unit without it.
                    </p>
                </div>

                {/* Signature lines */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '32px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid black', paddingTop: '6px', fontSize: '11px' }}>
                            Issued by (Technician)
                        </div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ borderTop: '1px solid black', paddingTop: '6px', fontSize: '11px' }}>
                            Received by (Customer)
                        </div>
                    </div>
                </div>

                {/* Footer note */}
                <p style={{ marginTop: '16px', fontSize: '10px', color: '#6b7280', textAlign: 'center' }}>
                    This stub is proof of repair acceptance. Thank you for your patience.
                </p>
            </div>
        </>
    );
}
