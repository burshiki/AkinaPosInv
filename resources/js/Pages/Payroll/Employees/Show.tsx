import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PermissionGate } from '@/Components/app/permission-gate';
import EmployeeEditModal from './Edit';
import type { Employee, User } from '@/types';

interface Props {
    employee: Employee;
    users: Pick<User, 'id' | 'name' | 'email'>[];
}

export default function EmployeeShow({ employee, users }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const fmt = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

    return (
        <AuthenticatedLayout header={employee.full_name}>
            <Head title={employee.full_name} />
            <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('employees.index')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    <PermissionGate permission="payroll.manage_employees">
                        <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" /> Edit</Button>
                    </PermissionGate>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Employee #</span><span className="font-mono">{employee.employee_number}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{employee.full_name}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Position</span><span>{employee.position ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span>{employee.department ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{employee.phone ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Date Hired</span><span>{employee.hired_at}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={employee.is_active ? 'default' : 'secondary'}>{employee.is_active ? 'Active' : 'Inactive'}</Badge></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Compensation & Gov IDs</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Pay Type</span><Badge variant="outline">{employee.pay_type}</Badge></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{employee.pay_type === 'monthly' ? 'Monthly Salary' : 'Daily Rate'}</span><span className="font-mono">{fmt(employee.basic_salary)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Daily Rate Equiv.</span><span className="font-mono">{fmt(employee.daily_rate)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">SSS</span><span className="font-mono">{employee.sss_number ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">PhilHealth</span><span className="font-mono">{employee.philhealth_number ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Pag-IBIG</span><span className="font-mono">{employee.pagibig_number ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">TIN</span><span className="font-mono">{employee.tin ?? '—'}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Tax Status</span><span>{employee.tax_status}</span></div>
                        </CardContent>
                    </Card>
                </div>

                {employee.payroll_records && employee.payroll_records.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle>Payroll History</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead className="text-right">Gross</TableHead>
                                        <TableHead className="text-right">Deductions</TableHead>
                                        <TableHead className="text-right">Net Pay</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employee.payroll_records.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell>
                                                <Link href={route('payroll-records.show', r.id)} className="text-primary hover:underline">
                                                    {r.payroll_period?.name ?? `Period #${r.payroll_period_id}`}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{fmt(r.gross_pay)}</TableCell>
                                            <TableCell className="text-right font-mono">{fmt(r.total_deductions)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">{fmt(r.net_pay)}</TableCell>
                                            <TableCell><Badge variant={r.status === 'paid' ? 'default' : 'secondary'}>{r.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <EmployeeEditModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                employee={employee}
                users={users}
            />
        </AuthenticatedLayout>
    );
}
