import { Head } from '@inertiajs/react';
import type { PayslipRecord } from '@/types';

interface Props {
    payslip: PayslipRecord;
}

export default function PayslipPrint({ payslip }: Props) {
    const record = payslip.payroll_record!;
    const emp = record.employee!;
    const period = record.payroll_period!;
    const fmt = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

    return (
        <>
            <Head title={`Print Payslip ${payslip.payslip_number}`} />
            <div className="mx-auto max-w-[600px] p-8 text-sm font-sans print:p-0 print:max-w-full">
                <div className="text-center mb-6">
                    <h1 className="text-lg font-bold">PAYSLIP</h1>
                    <p className="text-gray-500">{payslip.payslip_number}</p>
                </div>

                <table className="w-full mb-4 text-sm">
                    <tbody>
                        <tr>
                            <td className="text-gray-500 py-0.5">Employee:</td>
                            <td className="font-medium py-0.5">{emp.full_name}</td>
                            <td className="text-gray-500 py-0.5">Emp #:</td>
                            <td className="font-mono py-0.5">{emp.employee_number}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-500 py-0.5">Period:</td>
                            <td className="py-0.5">{period.name}</td>
                            <td className="text-gray-500 py-0.5">Pay Type:</td>
                            <td className="py-0.5">{record.pay_type}</td>
                        </tr>
                        <tr>
                            <td className="text-gray-500 py-0.5">Position:</td>
                            <td className="py-0.5">{emp.position ?? '—'}</td>
                            <td className="text-gray-500 py-0.5">Department:</td>
                            <td className="py-0.5">{emp.department ?? '—'}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="border-t border-b py-2 mb-2">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                        <div className="font-bold text-xs uppercase col-span-2 mb-1 text-gray-500">EARNINGS</div>
                        <div>Basic Pay</div><div className="text-right font-mono">{fmt(record.basic_pay)}</div>
                        <div>Overtime Pay</div><div className="text-right font-mono">{fmt(record.overtime_pay)}</div>
                        <div>Holiday Pay</div><div className="text-right font-mono">{fmt(record.holiday_pay)}</div>
                        <div>Allowances</div><div className="text-right font-mono">{fmt(record.allowances)}</div>
                        <div className="font-bold border-t pt-1 mt-1">Gross Pay</div>
                        <div className="text-right font-mono font-bold border-t pt-1 mt-1">{fmt(record.gross_pay)}</div>
                    </div>
                </div>

                <div className="border-b py-2 mb-2">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                        <div className="font-bold text-xs uppercase col-span-2 mb-1 text-gray-500">DEDUCTIONS</div>
                        <div>SSS</div><div className="text-right font-mono">{fmt(record.sss_employee)}</div>
                        <div>PhilHealth</div><div className="text-right font-mono">{fmt(record.philhealth_employee)}</div>
                        <div>Pag-IBIG</div><div className="text-right font-mono">{fmt(record.pagibig_employee)}</div>
                        <div>Withholding Tax</div><div className="text-right font-mono">{fmt(record.bir_withholding_tax)}</div>
                        {Number(record.late_deduction) > 0 && <><div>Late Deduction</div><div className="text-right font-mono">{fmt(record.late_deduction)}</div></>}
                        {Number(record.cash_advance) > 0 && <><div>Cash Advance</div><div className="text-right font-mono">{fmt(record.cash_advance)}</div></>}
                        {Number(record.loan_deduction) > 0 && <><div>Loan Deduction</div><div className="text-right font-mono">{fmt(record.loan_deduction)}</div></>}
                        {Number(record.other_deductions) > 0 && <><div>Other</div><div className="text-right font-mono">{fmt(record.other_deductions)}</div></>}
                        <div className="font-bold border-t pt-1 mt-1">Total Deductions</div>
                        <div className="text-right font-mono font-bold border-t pt-1 mt-1">{fmt(record.total_deductions)}</div>
                    </div>
                </div>

                <div className="text-center py-4 bg-gray-100 rounded mb-6">
                    <div className="text-xs text-gray-500 uppercase">Net Pay</div>
                    <div className="text-2xl font-bold font-mono">{fmt(record.net_pay)}</div>
                </div>

                <div className="grid grid-cols-2 gap-16 mt-12 text-center text-xs text-gray-500">
                    <div>
                        <div className="border-t border-gray-400 pt-1">Employee Signature</div>
                    </div>
                    <div>
                        <div className="border-t border-gray-400 pt-1">Authorized Signature</div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={() => window.print()} className="print:hidden px-4 py-2 bg-black text-white rounded text-sm">
                        Print Payslip
                    </button>
                </div>
            </div>
        </>
    );
}
