import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { PermissionGate } from '@/Components/app/permission-gate';
import { useConfirm } from '@/Components/app/confirm-dialog';
import { ArrowLeft, Calculator, Lock, LockOpen, ClipboardList, FileText, Printer, Trash2 } from 'lucide-react';
import { formatDateOnly } from '@/lib/utils';
import type { PayrollPeriod, PayrollRecord } from '@/types';

interface Props {
    period: PayrollPeriod & {
        payroll_records: (PayrollRecord & { employee: { full_name: string; employee_number: string }; payslip?: { id: number; payslip_number: string } })[];
        created_by_user?: { name: string };
        approved_by_user?: { name: string };
    };
}

export default function PeriodShow({ period }: Props) {
    const confirm = useConfirm();
    const fmt = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

    const handleCompute = async () => {
        const ok = await confirm({ title: 'Compute Payroll', description: 'Compute payroll for all employees with attendance records?', confirmLabel: 'Compute' });
        if (ok) router.post(route('payroll-periods.compute', period.id));
    };

    const handleLock = async () => {
        const ok = await confirm({ title: 'Lock Period', description: 'Lock this period? Records will no longer be editable.', confirmLabel: 'Lock', variant: 'destructive' });
        if (ok) router.post(route('payroll-periods.lock', period.id));
    };

    const handleUnlock = async () => {
        const ok = await confirm({ title: 'Unlock Period', description: 'Unlock this period? All confirmed records will return to draft and become editable again.', confirmLabel: 'Unlock', variant: 'destructive' });
        if (ok) router.post(route('payroll-periods.unlock', period.id));
    };

    const handleDelete = async () => {
        const ok = await confirm({ title: 'Delete Period', description: 'Delete this payroll period and all its records?', confirmLabel: 'Delete', variant: 'destructive' });
        if (ok) router.delete(route('payroll-periods.destroy', period.id));
    };

    const handleGeneratePayslip = (recordId: number) => {
        router.post(route('payslips.generate', recordId));
    };

    const printAllPayslips = () => {
        if (records.length === 0) return;
        const n = (v: number | string) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(Number(v));
        const appName = (import.meta.env.VITE_APP_NAME as string) ?? 'Akina POS';
        const row = (label: string, value: string, bold = false) =>
            `<div class="row${bold ? ' bold' : ''}"><span>${label}</span><span class="val">${value}</span></div>`;
        const optRow = (label: string, val: number | string) =>
            Number(val) > 0 ? row(label, n(val)) : '';
        const printedDate = new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' });
        const periodStart = formatDateOnly(period.period_start);
        const periodEnd = formatDateOnly(period.period_end);

        const slips = records.map((r) => `
<div class="slip">
<div class="center"><h1>${appName}</h1><h2>PAYSLIP</h2></div>
<div class="divider"></div>
${row('Period', periodStart)}
${row('', '\u2014 ' + periodEnd)}
<div class="divider"></div>
<div class="bold">EMPLOYEE</div>
${row('Name', r.employee?.full_name ?? '\u2014')}
${row('Emp #', r.employee?.employee_number ?? '\u2014')}
${row('Pay Type', r.pay_type)}
<div class="divider"></div>
<div class="bold">EARNINGS</div>
${row('Basic Pay', n(r.basic_pay))}
${optRow('Overtime Pay', r.overtime_pay)}
${optRow('Holiday Pay', r.holiday_pay)}
${optRow('Allowances', r.allowances)}
${Number(r.late_deduction) > 0 ? row('Late Deduction', '-' + n(r.late_deduction)) : ''}
<div class="divider"></div>
${row('Gross Pay', n(r.gross_pay), true)}
<div class="divider"></div>
<div class="bold">DEDUCTIONS</div>
${optRow('SSS', r.sss_employee)}
${optRow('PhilHealth', r.philhealth_employee)}
${optRow('Pag-IBIG', r.pagibig_employee)}
${optRow('BIR Tax', r.bir_withholding_tax)}
${optRow('Late', r.late_deduction)}
${optRow('Cash Advance', r.cash_advance)}
${optRow('Loan', r.loan_deduction)}
${Number(r.other_deductions) > 0 ? row('Other' + (r.other_deductions_notes ? ' (' + r.other_deductions_notes + ')' : ''), n(r.other_deductions)) : ''}
<div class="divider"></div>
${row('Total Deductions', n(r.total_deductions), true)}
<div class="divider"></div>
<div class="row big"><span>NET PAY</span><span class="val">${n(r.net_pay)}</span></div>
<div class="divider"></div>
<div class="center footer">Printed: ${printedDate}</div>
</div>`).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslips \u2014 ${period.name}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 9px; }
  .container { display: flex; flex-wrap: wrap; gap: 6mm; }
  .slip { width: calc(50% - 3mm); border: 1px dashed #aaa; padding: 4mm; page-break-inside: avoid; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .big { font-size: 11px; font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 3px 0; }
  .row { display: flex; justify-content: space-between; margin: 1px 0; }
  .val { text-align: right; min-width: 60px; }
  h1 { font-size: 12px; font-weight: bold; }
  h2 { font-size: 9px; font-weight: normal; }
  .footer { margin-top: 6px; font-size: 8px; }
</style></head><body><div class="container">${slips}</div></body></html>`;

        const win = window.open('', '_blank', 'width=420,height=700');
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 300);
    };

    const records = period.payroll_records ?? [];
    const totals = records.reduce((acc, r) => ({
        gross: acc.gross + Number(r.gross_pay),
        deductions: acc.deductions + Number(r.total_deductions),
        net: acc.net + Number(r.net_pay),
    }), { gross: 0, deductions: 0, net: 0 });

    return (
        <AuthenticatedLayout header={period.name}>
            <Head title={period.name} />
            <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('payroll-periods.index')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                        {records.length > 0 && (
                            <Button variant="outline" size="sm" onClick={printAllPayslips}>
                                <Printer className="mr-2 h-4 w-4" /> Print All Payslips
                            </Button>
                        )}
                        {period.status === 'locked' && (
                            <PermissionGate permission="payroll.approve">
                                <Button variant="outline" size="sm" onClick={handleUnlock}>
                                    <LockOpen className="mr-2 h-4 w-4" /> Unlock
                                </Button>
                            </PermissionGate>
                        )}
                        {period.status === 'draft' && (
                            <>
                                <PermissionGate permission="payroll.attendance">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={route('attendance.edit', period.id)}><ClipboardList className="mr-2 h-4 w-4" /> Attendance</Link>
                                    </Button>
                                </PermissionGate>
                                <PermissionGate permission="payroll.process">
                                    <Button variant="outline" size="sm" onClick={handleCompute}><Calculator className="mr-2 h-4 w-4" /> Compute Payroll</Button>
                                </PermissionGate>
                                <PermissionGate permission="payroll.approve">
                                    <Button variant="secondary" size="sm" onClick={handleLock} disabled={records.length === 0}><Lock className="mr-2 h-4 w-4" /> Lock</Button>
                                </PermissionGate>
                                <PermissionGate permission="payroll.process">
                                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                                </PermissionGate>
                            </>
                        )}

                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                    <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Status</div><Badge variant={period.status === 'paid' ? 'default' : period.status === 'locked' ? 'secondary' : 'outline'} className="mt-1">{period.status.toUpperCase()}</Badge></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Period</div><div className="mt-1 text-sm font-medium">{formatDateOnly(period.period_start)} — {formatDateOnly(period.period_end)}</div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Gross Pay</div><div className="mt-1 font-mono font-semibold">{fmt(totals.gross)}</div></CardContent></Card>
                    <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total Net Pay</div><div className="mt-1 font-mono font-semibold">{fmt(totals.net)}</div></CardContent></Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Payroll Records ({records.length})</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Emp #</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Deductions</TableHead>
                                    <TableHead className="text-right">Net Pay</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No records yet. Record attendance then compute payroll.</TableCell></TableRow>
                                ) : records.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-mono text-sm">{r.employee?.employee_number}</TableCell>
                                        <TableCell className="font-medium">{r.employee?.full_name}</TableCell>
                                        <TableCell className="text-right font-mono">{fmt(r.gross_pay)}</TableCell>
                                        <TableCell className="text-right font-mono">{fmt(r.total_deductions)}</TableCell>
                                        <TableCell className="text-right font-mono font-semibold">{fmt(r.net_pay)}</TableCell>
                                        <TableCell><Badge variant={r.status === 'paid' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Details">
                                                    <Link href={route('payroll-records.show', r.id)}><FileText className="h-3.5 w-3.5" /></Link>
                                                </Button>
                                                {r.payslip ? (
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                                        <Link href={route('payslips.show', r.payslip.id)}>Payslip</Link>
                                                    </Button>
                                                ) : (period.status !== 'draft') && (
                                                    <PermissionGate permission="payroll.process">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleGeneratePayslip(r.id)}>Gen Payslip</Button>
                                                    </PermissionGate>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {records.length > 0 && (
                                    <TableRow className="font-semibold bg-muted/50">
                                        <TableCell colSpan={2}>Total</TableCell>
                                        <TableCell className="text-right font-mono">{fmt(totals.gross)}</TableCell>
                                        <TableCell className="text-right font-mono">{fmt(totals.deductions)}</TableCell>
                                        <TableCell className="text-right font-mono">{fmt(totals.net)}</TableCell>
                                        <TableCell colSpan={2}></TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
