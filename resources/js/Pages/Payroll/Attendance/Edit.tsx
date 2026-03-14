import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import type { PayrollPeriod, Employee, AttendanceRecord, HolidayEntry } from '@/types';

interface Props {
    period: PayrollPeriod;
    employees: Employee[];
    existingAttendance: Record<number, AttendanceRecord>;
    holidays: HolidayEntry[];
}

interface AttendanceRow {
    employee_id: number;
    days_present: number;
    days_absent: number;
    days_late: number;
    overtime_hours: number;
    late_deduction: number;
    regular_holidays_not_worked: number;
    regular_holidays_worked: number;
    special_holidays_worked: number;
    regular_holidays_restday_worked: number;
    special_holidays_restday_worked: number;
    notes: string;
}

export default function AttendanceEdit({ period, employees, existingAttendance, holidays }: Props) {
    const defaultRow = (empId: number): AttendanceRow => {
        const existing = existingAttendance[empId];
        return {
            employee_id: empId,
            days_present: existing?.days_present ?? 0,
            days_absent: existing?.days_absent ?? 0,
            days_late: existing?.days_late ?? 0,
            overtime_hours: existing?.overtime_hours ?? 0,
            late_deduction: existing?.late_deduction ?? 0,
            regular_holidays_not_worked: existing?.regular_holidays_not_worked ?? 0,
            regular_holidays_worked: existing?.regular_holidays_worked ?? 0,
            special_holidays_worked: existing?.special_holidays_worked ?? 0,
            regular_holidays_restday_worked: existing?.regular_holidays_restday_worked ?? 0,
            special_holidays_restday_worked: existing?.special_holidays_restday_worked ?? 0,
            notes: existing?.notes ?? '',
        };
    };

    const { data, setData, post, processing } = useForm({
        attendance: employees.map((e) => defaultRow(e.id)),
    });

    const updateRow = (idx: number, field: keyof AttendanceRow, value: number | string) => {
        const updated = [...data.attendance];
        (updated[idx] as unknown as Record<string, unknown>)[field] = value;
        setData('attendance', updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('attendance.bulk-store', period.id));
    };

    const regularHolidays = holidays.filter((h) => h.type === 'regular');
    const specialHolidays = holidays.filter((h) => h.type === 'special_non_working');

    return (
        <AuthenticatedLayout header={`Attendance — ${period.name}`}>
            <Head title={`Attendance — ${period.name}`} />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('payroll-periods.show', period.id)}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Period</Link>
                    </Button>
                    <Button type="submit" form="attendance-form" disabled={processing}>
                        <Save className="mr-2 h-4 w-4" /> Save Attendance
                    </Button>
                </div>

                {holidays.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-sm">Holidays in this Period</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {holidays.map((h) => (
                                    <Badge key={h.id} variant={h.type === 'regular' ? 'default' : h.type === 'special_non_working' ? 'secondary' : 'outline'}>
                                        {h.name} ({h.date})
                                    </Badge>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                RH = Regular Holiday (200% worked, 100% not worked for daily).
                                SNW = Special Non-Working (130% worked).
                                Eligibility: employee must have worked the day before an RH to receive not-worked pay.
                            </p>
                        </CardContent>
                    </Card>
                )}

                <form id="attendance-form" onSubmit={handleSubmit}>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/50 text-xs uppercase">
                                <tr>
                                    <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium">Employee</th>
                                    <th className="px-2 py-2 text-center font-medium">Present</th>
                                    <th className="px-2 py-2 text-center font-medium">Absent</th>
                                    <th className="px-2 py-2 text-center font-medium">Late</th>
                                    <th className="px-2 py-2 text-center font-medium">OT Hrs</th>
                                    <th className="px-2 py-2 text-center font-medium">Late Ded.</th>
                                    {regularHolidays.length > 0 && <>
                                        <th className="px-2 py-2 text-center font-medium bg-red-50 dark:bg-red-950/30">RH NW</th>
                                        <th className="px-2 py-2 text-center font-medium bg-red-50 dark:bg-red-950/30">RH W</th>
                                        <th className="px-2 py-2 text-center font-medium bg-red-50 dark:bg-red-950/30">RH+RD W</th>
                                    </>}
                                    {specialHolidays.length > 0 && <>
                                        <th className="px-2 py-2 text-center font-medium bg-amber-50 dark:bg-amber-950/30">SNW W</th>
                                        <th className="px-2 py-2 text-center font-medium bg-amber-50 dark:bg-amber-950/30">SNW+RD W</th>
                                    </>}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, idx) => (
                                    <tr key={emp.id} className="border-t">
                                        <td className="sticky left-0 z-10 bg-background px-3 py-1 font-medium whitespace-nowrap">
                                            {emp.full_name}
                                            <span className="ml-2 text-xs text-muted-foreground">{emp.pay_type === 'monthly' ? 'M' : 'D'}</span>
                                        </td>
                                        <td className="px-1 py-1"><Input type="text" inputMode="decimal" className="h-8 w-16 text-center" value={data.attendance[idx].days_present} onChange={(e) => updateRow(idx, 'days_present', Number(e.target.value))} /></td>
                                        <td className="px-1 py-1"><Input type="text" inputMode="decimal" className="h-8 w-16 text-center" value={data.attendance[idx].days_absent} onChange={(e) => updateRow(idx, 'days_absent', Number(e.target.value))} /></td>
                                        <td className="px-1 py-1"><Input type="text" inputMode="numeric" className="h-8 w-16 text-center" value={data.attendance[idx].days_late} onChange={(e) => updateRow(idx, 'days_late', Number(e.target.value))} /></td>
                                        <td className="px-1 py-1"><Input type="text" inputMode="decimal" className="h-8 w-16 text-center" value={data.attendance[idx].overtime_hours} onChange={(e) => updateRow(idx, 'overtime_hours', Number(e.target.value))} /></td>
                                        <td className="px-1 py-1"><Input type="text" inputMode="decimal" className="h-8 w-20 text-center" value={data.attendance[idx].late_deduction} onChange={(e) => updateRow(idx, 'late_deduction', Number(e.target.value))} /></td>
                                        {regularHolidays.length > 0 && <>
                                            <td className="px-1 py-1 bg-red-50/50 dark:bg-red-950/10"><Input type="text" inputMode="numeric" className="h-8 w-14 text-center" value={data.attendance[idx].regular_holidays_not_worked} onChange={(e) => updateRow(idx, 'regular_holidays_not_worked', Number(e.target.value))} /></td>
                                            <td className="px-1 py-1 bg-red-50/50 dark:bg-red-950/10"><Input type="text" inputMode="numeric" className="h-8 w-14 text-center" value={data.attendance[idx].regular_holidays_worked} onChange={(e) => updateRow(idx, 'regular_holidays_worked', Number(e.target.value))} /></td>
                                            <td className="px-1 py-1 bg-red-50/50 dark:bg-red-950/10"><Input type="text" inputMode="numeric" className="h-8 w-14 text-center" value={data.attendance[idx].regular_holidays_restday_worked} onChange={(e) => updateRow(idx, 'regular_holidays_restday_worked', Number(e.target.value))} /></td>
                                        </>}
                                        {specialHolidays.length > 0 && <>
                                            <td className="px-1 py-1 bg-amber-50/50 dark:bg-amber-950/10"><Input type="text" inputMode="numeric" className="h-8 w-14 text-center" value={data.attendance[idx].special_holidays_worked} onChange={(e) => updateRow(idx, 'special_holidays_worked', Number(e.target.value))} /></td>
                                            <td className="px-1 py-1 bg-amber-50/50 dark:bg-amber-950/10"><Input type="text" inputMode="numeric" className="h-8 w-14 text-center" value={data.attendance[idx].special_holidays_restday_worked} onChange={(e) => updateRow(idx, 'special_holidays_restday_worked', Number(e.target.value))} /></td>
                                        </>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
