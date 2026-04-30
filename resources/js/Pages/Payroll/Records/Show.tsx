import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { ArrowLeft, Save, Banknote, CreditCard, Wallet } from 'lucide-react';
import { useState, FormEvent } from 'react';
import type { PayrollRecord, BankAccount } from '@/types';

interface DrawerSession {
    id: number;
    status: string;
    opened_at: string;
}

interface Props {
    record: PayrollRecord;
    bankAccounts: BankAccount[];
    openDrawerSession: DrawerSession | null;
}

type FormData = {
    allowances: string;
    sss_employee: string;
    philhealth_employee: string;
    pagibig_employee: string;
    bir_withholding_tax: string;
    sss_employer: string;
    sss_ec: string;
    philhealth_employer: string;
    pagibig_employer: string;
    cash_advance: string;
    loan_deduction: string;
    other_deductions: string;
    other_deductions_notes: string;
};

const fmt = (n: number | string) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(Number(n));

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className="flex justify-between py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
);

const Field = ({
    label, field, data, setData, error,
}: {
    label: string;
    field: keyof FormData;
    data: FormData;
    setData: (field: keyof FormData, value: string) => void;
    error?: string;
}) => (
    <div className="flex items-center justify-between py-1 gap-4">
        <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
        <div className="w-36">
            <Input
                type="number"
                step="0.01"
                min="0"
                value={data[field]}
                onChange={(e) => setData(field, e.target.value)}
                className="h-7 text-right font-mono text-sm"
            />
            {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
        </div>
    </div>
);

export default function RecordShow({ record, bankAccounts, openDrawerSession }: Props) {
    const emp = record.employee;
    const period = record.payroll_period;
    const isDraft = record.status === 'draft';

    const [showDisburse, setShowDisburse] = useState(false);
    const [disbursing, setDisbursing] = useState(false);
    const [disburseSource, setDisburseSource] = useState<'cash_drawer' | 'bank_account'>('bank_account');
    const [disburseDisbursementId, setDisburseDisbursementId] = useState('');
    const [disburseNotes, setDisburseNotes] = useState('');

    function handleDisburse(e: FormEvent) {
        e.preventDefault();
        if (!disburseDisbursementId) return;
        setDisbursing(true);
        router.post(route('payroll-records.disburse', record.id), {
            disbursement_source: disburseSource,
            disbursement_id: parseInt(disburseDisbursementId),
            disbursement_notes: disburseNotes || null,
        }, {
            onSuccess: () => setShowDisburse(false),
            onFinish: () => setDisbursing(false),
        });
    }

    const disbursementLabel = record.disbursement_source === 'cash_drawer' ? 'Cash Drawer' : 'Bank Account';

    const { data, setData, put, processing, errors } = useForm({
        allowances:             String(record.allowances),
        sss_employee:           String(record.sss_employee),
        philhealth_employee:    String(record.philhealth_employee),
        pagibig_employee:       String(record.pagibig_employee),
        bir_withholding_tax:    String(record.bir_withholding_tax),
        sss_employer:           String(record.sss_employer),
        sss_ec:                 String(record.sss_ec),
        philhealth_employer:    String(record.philhealth_employer),
        pagibig_employer:       String(record.pagibig_employer),
        cash_advance:           String(record.cash_advance),
        loan_deduction:         String(record.loan_deduction),
        other_deductions:       String(record.other_deductions),
        other_deductions_notes: record.other_deductions_notes ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('payroll-records.update', record.id));
    };

    // Live-preview net pay from current form values
    const grossPreview = Number(record.basic_pay) + Number(record.overtime_pay) + Number(record.holiday_pay)
        + Number(data.allowances || 0) - Number(record.late_deduction);
    const totalDeductionsPreview = Number(data.sss_employee || 0) + Number(data.philhealth_employee || 0)
        + Number(data.pagibig_employee || 0) + Number(data.bir_withholding_tax || 0)
        + Number(data.cash_advance || 0) + Number(data.loan_deduction || 0) + Number(data.other_deductions || 0);
    const netPayPreview = grossPreview - totalDeductionsPreview;

    return (
        <AuthenticatedLayout header="Payroll Record Details">
            <Head title="Payroll Record" />
            <div className="mx-auto max-w-2xl space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('payroll-periods.show', record.payroll_period_id)}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Period</Link>
                </Button>

                <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{emp?.full_name ?? 'Employee'}</CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>{record.status}</Badge>
                                {isDraft && (
                                    <Button type="submit" size="sm" disabled={processing}>
                                        <Save className="mr-2 h-3.5 w-3.5" /> Save
                                    </Button>
                                )}
                                {record.status === 'confirmed' && (
                                    <PermissionGate permission="payroll.process">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="border-green-600 text-green-700 hover:bg-green-50"
                                            onClick={() => setShowDisburse(true)}
                                        >
                                            <Banknote className="mr-1.5 h-3.5 w-3.5" /> Disburse
                                        </Button>
                                    </PermissionGate>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{period?.name} | {record.pay_type} rate | Snapshot: {fmt(record.basic_salary_snapshot)}</p>
                        {isDraft && <p className="text-xs text-blue-600 dark:text-blue-400">Draft — deductions are editable. Net pay updates as you type.</p>}
                    </CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        <div>
                            <h4 className="mb-2 font-semibold uppercase text-xs text-muted-foreground tracking-wider">Attendance</h4>
                            <Row label="Days Present" value={String(record.days_present)} />
                            <Row label="Days Absent" value={String(record.days_absent)} />
                            <Row label="Overtime Hours" value={String(record.overtime_hours)} />
                        </div>

                        <div>
                            <h4 className="mb-2 font-semibold uppercase text-xs text-muted-foreground tracking-wider">Earnings</h4>
                            <Row label="Basic Pay" value={fmt(record.basic_pay)} />
                            <Row label="Overtime Pay" value={fmt(record.overtime_pay)} />
                            <Row label="Holiday Pay" value={fmt(record.holiday_pay)} />
                            {isDraft
                                ? <Field label="Allowances" field="allowances" data={data} setData={setData} error={errors.allowances} />
                                : <Row label="Allowances" value={fmt(record.allowances)} />
                            }
                            <Row label="Late Deduction" value={`-${fmt(record.late_deduction)}`} />
                            <div className="border-t pt-1 mt-1">
                                <Row label="Gross Pay" value={fmt(isDraft ? grossPreview : record.gross_pay)} bold />
                            </div>
                        </div>

                        <div>
                            <h4 className="mb-2 font-semibold uppercase text-xs text-muted-foreground tracking-wider">
                                Employee Deductions {isDraft && <span className="text-blue-500 normal-case font-normal">(editable)</span>}
                            </h4>
                            {isDraft ? (
                                <>
                                    <Field label="SSS" field="sss_employee" data={data} setData={setData} error={errors.sss_employee} />
                                    <Field label="PhilHealth" field="philhealth_employee" data={data} setData={setData} error={errors.philhealth_employee} />
                                    <Field label="Pag-IBIG" field="pagibig_employee" data={data} setData={setData} error={errors.pagibig_employee} />
                                    <Field label="BIR Withholding Tax" field="bir_withholding_tax" data={data} setData={setData} error={errors.bir_withholding_tax} />
                                    <Field label="C.A. (Cash Advance)" field="cash_advance" data={data} setData={setData} error={errors.cash_advance} />
                                    <Field label="Loan Deduction" field="loan_deduction" data={data} setData={setData} error={errors.loan_deduction} />
                                    <Field label="Other Deductions" field="other_deductions" data={data} setData={setData} error={errors.other_deductions} />
                                    <div className="py-1">
                                        <span className="text-muted-foreground text-xs">Other Deductions Notes</span>
                                        <Input
                                            value={data.other_deductions_notes}
                                            onChange={(e) => setData('other_deductions_notes', e.target.value)}
                                            className="h-7 text-sm mt-1"
                                            placeholder="Optional note..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Row label="SSS" value={fmt(record.sss_employee)} />
                                    <Row label="PhilHealth" value={fmt(record.philhealth_employee)} />
                                    <Row label="Pag-IBIG" value={fmt(record.pagibig_employee)} />
                                    <Row label="BIR Withholding Tax" value={fmt(record.bir_withholding_tax)} />
                                    {Number(record.cash_advance) > 0 && <Row label="C.A. (Cash Advance)" value={fmt(record.cash_advance)} />}
                                    {Number(record.loan_deduction) > 0 && <Row label="Loan Deduction" value={fmt(record.loan_deduction)} />}
                                    {Number(record.other_deductions) > 0 && <Row label={`Other (${record.other_deductions_notes ?? ''})`} value={fmt(record.other_deductions)} />}
                                </>
                            )}
                            <div className="border-t pt-1 mt-1">
                                <Row label="Total Deductions" value={fmt(isDraft ? totalDeductionsPreview : record.total_deductions)} bold />
                            </div>
                        </div>

                        <div className="rounded-md bg-muted p-3">
                            <Row label="NET PAY" value={fmt(isDraft ? netPayPreview : record.net_pay)} bold />
                        </div>

                        {/* Disbursement info (after paid) */}
                        {record.status === 'paid' && record.disbursement_source && (
                            <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">Disbursed</p>
                                <Row label="Via" value={disbursementLabel} />
                                {record.paid_at && (
                                    <Row label="Paid At" value={new Date(record.paid_at).toLocaleString()} />
                                )}
                                {record.disbursement_notes && (
                                    <Row label="Notes" value={record.disbursement_notes} />
                                )}
                            </div>
                        )}

                        <div>
                            <h4 className="mb-2 font-semibold uppercase text-xs text-muted-foreground tracking-wider">
                                Employer Share (not deducted) {isDraft && <span className="text-blue-500 normal-case font-normal">(editable)</span>}
                            </h4>
                            {isDraft ? (
                                <>
                                    <Field label="SSS Employer" field="sss_employer" data={data} setData={setData} error={errors.sss_employer} />
                                    <Field label="SSS EC" field="sss_ec" data={data} setData={setData} error={errors.sss_ec} />
                                    <Field label="PhilHealth Employer" field="philhealth_employer" data={data} setData={setData} error={errors.philhealth_employer} />
                                    <Field label="Pag-IBIG Employer" field="pagibig_employer" data={data} setData={setData} error={errors.pagibig_employer} />
                                </>
                            ) : (
                                <>
                                    <Row label="SSS Employer" value={fmt(record.sss_employer)} />
                                    <Row label="SSS EC" value={fmt(record.sss_ec)} />
                                    <Row label="PhilHealth Employer" value={fmt(record.philhealth_employer)} />
                                    <Row label="Pag-IBIG Employer" value={fmt(record.pagibig_employer)} />
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
                </form>
            </div>

            {/* Disburse Payment Dialog */}
            <Dialog open={showDisburse} onOpenChange={(open) => { if (!open) setShowDisburse(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Disburse Payroll</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleDisburse} className="space-y-4">
                        <div className="rounded-md bg-muted p-3 text-sm">
                            <p className="font-medium">{emp?.full_name ?? 'Employee'}</p>
                            <p className="text-muted-foreground">{period?.name}</p>
                            <p className="mt-1 font-semibold text-green-700">Net Pay: ₱{fmt(record.net_pay)}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Disburse Via *</Label>
                            <Select
                                value={disburseSource}
                            onValueChange={(v) => {
                                    const src = v as 'cash_drawer' | 'bank_account';
                                    setDisburseSource(src);
                                    setDisburseDisbursementId(
                                        src === 'cash_drawer' && openDrawerSession
                                            ? String(openDrawerSession.id)
                                            : ''
                                    );
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_account">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" /> Bank / E-wallet Account
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="cash_drawer" disabled={!openDrawerSession}>
                                        <div className="flex items-center gap-2">
                                            <Wallet className="h-4 w-4" /> Cash Drawer{!openDrawerSession && ' (no open session)'}
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {disburseSource === 'bank_account' && (
                            <div className="space-y-2">
                                <Label>Account *</Label>
                                <Select value={disburseDisbursementId} onValueChange={setDisburseDisbursementId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bankAccounts.map((a) => (
                                            <SelectItem key={a.id} value={String(a.id)}>
                                                {a.bank_name ? `${a.bank_name} - ${a.name}` : a.name}
                                                {' — ₱'}{fmt(a.balance)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {disburseSource === 'cash_drawer' && openDrawerSession && (
                            <div className="space-y-2">
                                <Label>Cash Drawer Session *</Label>
                                <div
                                    className="cursor-pointer rounded-md border p-3 text-sm bg-blue-50 dark:bg-blue-950"
                                    onClick={() => setDisburseDisbursementId(String(openDrawerSession.id))}
                                >
                                    <p className="font-medium">Open Session #{openDrawerSession.id}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Opened: {new Date(openDrawerSession.opened_at).toLocaleString()}
                                    </p>
                                    <input type="hidden" value={disburseDisbursementId} readOnly />
                                </div>
                                {!disburseDisbursementId && (
                                    <p className="text-xs text-muted-foreground">Click the session above to select it.</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={disburseNotes}
                                onChange={(e) => setDisburseNotes(e.target.value)}
                                placeholder="Optional notes (e.g. GCash ref#)"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDisburse(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={disbursing || !disburseDisbursementId}
                                className="bg-green-700 hover:bg-green-800"
                            >
                                <Banknote className="mr-2 h-4 w-4" />
                                {disbursing ? 'Disbursing...' : 'Confirm Disbursement'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
