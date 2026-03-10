import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Plus, Eye } from 'lucide-react';
import { formatDateOnly } from '@/lib/utils';
import type { PayrollPeriod, PaginatedData } from '@/types';

interface Props {
    periods: PaginatedData<PayrollPeriod & { created_by_user?: { name: string } }>;
}

const statusVariant = (s: string) => s === 'paid' ? 'default' : s === 'locked' ? 'secondary' : 'outline';

export default function PeriodsIndex({ periods }: Props) {
    return (
        <AuthenticatedLayout header="Payroll Periods">
            <Head title="Payroll Periods" />
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('employees.index')}>Employees</Link>
                        </Button>
                    </div>
                    <PermissionGate permission="payroll.process">
                        <Button asChild><Link href={route('payroll-periods.create')}><Plus className="mr-2 h-4 w-4" /> New Period</Link></Button>
                    </PermissionGate>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Records</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {periods.data.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No payroll periods yet</TableCell></TableRow>
                            ) : periods.data.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-sm">{formatDateOnly(p.period_start)} — {formatDateOnly(p.period_end)}</TableCell>
                                    <TableCell>{p.payroll_records_count ?? 0}</TableCell>
                                    <TableCell><Badge variant={statusVariant(p.status)}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge></TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{p.created_by_user?.name ?? '—'}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View">
                                            <Link href={route('payroll-periods.show', p.id)}><Eye className="h-4 w-4" /></Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Pagination data={periods} />
            </div>
        </AuthenticatedLayout>
    );
}
