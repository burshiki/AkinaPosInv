import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { useDebounce } from '@/hooks/use-debounce';
import { useConfirm } from '@/Components/app/confirm-dialog';
import { Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Employee, PaginatedData, User } from '@/types';
import EmployeeCreateModal from './Create';
import EmployeeEditModal from './Edit';

interface Props {
    employees: PaginatedData<Employee>;
    departments: string[];
    filters: { search?: string; pay_type?: string; department?: string; status?: string };
    users: Pick<User, 'id' | 'name' | 'email'>[];
}

export default function EmployeesIndex({ employees, departments, filters, users }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        router.get(route('employees.index'), {
            search: debouncedSearch || undefined,
            pay_type: filters.pay_type || undefined,
            department: filters.department || undefined,
            status: filters.status || undefined,
        }, { preserveState: true, replace: true });
    }, [debouncedSearch]);

    const handleFilter = (key: string, value: string) => {
        router.get(route('employees.index'), {
            search: search || undefined,
            pay_type: key === 'pay_type' ? (value === 'all' ? undefined : value) : (filters.pay_type || undefined),
            department: key === 'department' ? (value === 'all' ? undefined : value) : (filters.department || undefined),
            status: key === 'status' ? (value === 'all' ? undefined : value) : (filters.status || undefined),
        }, { preserveState: true, replace: true });
    };

    const handleDelete = async (emp: Employee) => {
        const ok = await confirm({
            title: 'Delete Employee',
            description: `Delete employee "${emp.full_name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('employees.destroy', emp.id));
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(n);

    return (
        <AuthenticatedLayout header="Employees">
            <Head title="Employees" />
            <div className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>
                        <Select value={filters.pay_type ?? 'all'} onValueChange={(v) => handleFilter('pay_type', v)}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="Pay Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                            </SelectContent>
                        </Select>
                        {departments.length > 0 && (
                            <Select value={filters.department ?? 'all'} onValueChange={(v) => handleFilter('department', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Department" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Depts</SelectItem>
                                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={filters.status ?? 'all'} onValueChange={(v) => handleFilter('status', v)}>
                            <SelectTrigger className="w-28"><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <PermissionGate permission="payroll.manage_employees">
                        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>
                    </PermissionGate>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Emp #</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Pay Type</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.data.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No employees found</TableCell></TableRow>
                            ) : employees.data.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono text-sm">{emp.employee_number}</TableCell>
                                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                                    <TableCell>{emp.position ?? '—'}</TableCell>
                                    <TableCell>{emp.department ?? '—'}</TableCell>
                                    <TableCell><Badge variant="outline">{emp.pay_type === 'monthly' ? 'Monthly' : 'Daily'}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{fmt(emp.basic_salary)}</TableCell>
                                    <TableCell><Badge variant={emp.is_active ? 'default' : 'secondary'}>{emp.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="View">
                                                <Link href={route('employees.show', emp.id)}><Eye className="h-4 w-4" /></Link>
                                            </Button>
                                            <PermissionGate permission="payroll.manage_employees">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => setEditingEmployee(emp)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(emp)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </PermissionGate>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Pagination data={employees} />
            </div>

            <EmployeeCreateModal open={createOpen} onClose={() => setCreateOpen(false)} users={users} />
            {editingEmployee && (
                <EmployeeEditModal
                    key={editingEmployee.id}
                    open={!!editingEmployee}
                    onClose={() => setEditingEmployee(null)}
                    employee={editingEmployee}
                    users={users}
                />
            )}
        </AuthenticatedLayout>
    );
}
