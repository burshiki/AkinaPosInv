import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';
import type { PayslipRecord } from '@/types';

interface Props {
    payslip: PayslipRecord;
}

export default function PayslipShow({ payslip }: Props) {
    const record = payslip.payroll_record!;
    const emp = record.employee!;
    const period = record.payroll_period!;
    const fmt = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

    return (
        <AuthenticatedLayout header={`Payslip ${payslip.payslip_number}`}>
            <Head title={`Payslip ${payslip.payslip_number}`} />
            <div className="mx-auto max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('payroll-periods.show', record.payroll_period_id)}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('payslips.print', payslip.id)}><Printer className="mr-2 h-4 w-4" /> Print</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-lg">PAYSLIP</CardTitle>
                        <p className="text-center text-sm text-muted-foreground">{payslip.payslip_number}</p>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-2 border-b pb-3">
                            <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{emp.full_name}</span></div>
                            <div><span className="text-muted-foreground">Emp #:</span> <span className="font-mono">{emp.employee_number}</span></div>
                            <div><span className="text-muted-foreground">Period:</span> {period.name}</div>
                            <div><span className="text-muted-foreground">Pay Type:</span> {record.pay_type}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                            <div className="font-semibold text-xs uppercase text-muted-foreground col-span-2 mt-2">Earnings</div>
                            <div>Basic Pay</div><div className="text-right font-mono">{fmt(record.basic_pay)}</div>
                            <div>Overtime Pay</div><div className="text-right font-mono">{fmt(record.overtime_pay)}</div>
                            <div>Holiday Pay</div><div className="text-right font-mono">{fmt(record.holiday_pay)}</div>
                            <div>Allowances</div><div className="text-right font-mono">{fmt(record.allowances)}</div>
                            <div className="font-semibold border-t pt-1">Gross Pay</div><div className="text-right font-mono font-semibold border-t pt-1">{fmt(record.gross_pay)}</div>

                            <div className="font-semibold text-xs uppercase text-muted-foreground col-span-2 mt-4">Deductions</div>
                            <div>SSS</div><div className="text-right font-mono">{fmt(record.sss_employee)}</div>
                            <div>PhilHealth</div><div className="text-right font-mono">{fmt(record.philhealth_employee)}</div>
                            <div>Pag-IBIG</div><div className="text-right font-mono">{fmt(record.pagibig_employee)}</div>
                            <div>Withholding Tax</div><div className="text-right font-mono">{fmt(record.bir_withholding_tax)}</div>
                            {Number(record.late_deduction) > 0 && <><div>Late Deduction</div><div className="text-right font-mono">{fmt(record.late_deduction)}</div></>}
                            {Number(record.cash_advance) > 0 && <><div>Cash Advance</div><div className="text-right font-mono">{fmt(record.cash_advance)}</div></>}
                            {Number(record.loan_deduction) > 0 && <><div>Loan Deduction</div><div className="text-right font-mono">{fmt(record.loan_deduction)}</div></>}
                            {Number(record.other_deductions) > 0 && <><div>Other</div><div className="text-right font-mono">{fmt(record.other_deductions)}</div></>}
                            <div className="font-semibold border-t pt-1">Total Deductions</div><div className="text-right font-mono font-semibold border-t pt-1">{fmt(record.total_deductions)}</div>
                        </div>

                        <div className="rounded-md bg-muted p-4 text-center">
                            <div className="text-xs text-muted-foreground uppercase">Net Pay</div>
                            <div className="text-2xl font-bold font-mono">{fmt(record.net_pay)}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
