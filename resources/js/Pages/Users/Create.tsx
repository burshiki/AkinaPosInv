import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { Separator } from '@/Components/ui/separator';
import { ArrowLeft } from 'lucide-react';
import { FormEvent } from 'react';

interface Props {
    allPermissions: { name: string; group: string }[];
}

const permissionLabels: Record<string, string> = {
    'products.view': 'View Products',
    'products.create': 'Create Products',
    'products.edit': 'Edit Products',
    'products.delete': 'Delete Products',
    'categories.view': 'View Categories',
    'categories.manage': 'Manage Categories',
    'assemblies.view': 'View Assemblies',
    'assemblies.build': 'Build Assemblies',
    'sales.create': 'Create Sales (POS)',
    'sales.view': 'View Sales History',
    'sales.void': 'Void Sales',
    'banking.view': 'View Bank Accounts',
    'banking.manage_accounts': 'Manage Accounts',
    'banking.record_entries': 'Record Entries',
    'banking.transfer': 'Transfer Between Accounts',
    'debts.view': 'View Customer Debts',
    'debts.receive_payment': 'Receive Debt Payments',
    'reports.sales': 'Sales Reports',
    'reports.inventory': 'Inventory Reports',
    'reports.financial': 'Financial Reports',
    'reports.debt_aging': 'Debt Aging Reports',
    'users.view': 'View Users',
    'users.create': 'Create Users',
    'users.edit': 'Edit Users',
    'users.delete': 'Delete Users',
    'payroll.view': 'View Payroll',
    'payroll.manage_employees': 'Manage Employees',
    'payroll.attendance': 'Record Attendance',
    'payroll.process': 'Compute Payroll & Payslips',
    'payroll.approve': 'Approve & Mark Paid',
    'payroll.reports': 'Payroll Reports',
    // Leave module
    'leave.view': 'View Leave Requests',
    'leave.request': 'File Leave Requests',
    'leave.approve': 'Approve / Reject Leave',
};

export default function UsersCreate({ allPermissions }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_admin: false,
        permissions: [] as string[],
    });

    function togglePermission(permission: string) {
        setData(
            'permissions',
            data.permissions.includes(permission)
                ? data.permissions.filter((p) => p !== permission)
                : [...data.permissions, permission],
        );
    }

    function toggleGroup(groupPermissions: string[]) {
        const allSelected = groupPermissions.every((p) => data.permissions.includes(p));
        if (allSelected) {
            setData('permissions', data.permissions.filter((p) => !groupPermissions.includes(p)));
        } else {
            setData('permissions', [...new Set([...data.permissions, ...groupPermissions])]);
        }
    }

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('users.store'));
    }

    // Group permissions by module
    const groups = allPermissions.reduce(
        (acc, perm) => {
            if (!acc[perm.group]) acc[perm.group] = [];
            acc[perm.group].push(perm.name);
            return acc;
        },
        {} as Record<string, string[]>,
    );

    return (
        <AuthenticatedLayout header="Create User">
            <Head title="Create User" />

            <div className="max-w-2xl space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('users.index')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Link>
                </Button>

                <form onSubmit={submit} className="space-y-4">
                    {/* Account Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                />
                                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password *</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                    />
                                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm Password *</Label>
                                    <Input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        autoComplete="new-password"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                    />
                                    {errors.password_confirmation && <p className="text-sm text-destructive">{errors.password_confirmation}</p>}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="is_admin"
                                    checked={data.is_admin}
                                    onCheckedChange={(checked) => setData('is_admin', !!checked)}
                                />
                                <Label htmlFor="is_admin" className="cursor-pointer">
                                    Administrator (full access to all features)
                                </Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permissions */}
                    {!data.is_admin && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Permissions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(groups).map(([group, permissions]) => (
                                    <div key={group}>
                                        <div className="mb-2 flex items-center space-x-2">
                                            <Checkbox
                                                id={`group-${group}`}
                                                checked={permissions.every((p: string) => data.permissions.includes(p))}
                                                onCheckedChange={() => toggleGroup(permissions)}
                                            />
                                            <Label htmlFor={`group-${group}`} className="cursor-pointer font-bold capitalize">
                                                {group}
                                            </Label>
                                        </div>
                                        <div className="ml-6 grid gap-2 sm:grid-cols-2">
                                            {permissions.map((perm: string) => (
                                                <div key={perm} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={perm}
                                                        checked={data.permissions.includes(perm)}
                                                        onCheckedChange={() => togglePermission(perm)}
                                                    />
                                                    <Label htmlFor={perm} className="cursor-pointer text-sm">
                                                        {permissionLabels[perm] || perm}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                        <Separator className="mt-3" />
                                    </div>
                                ))}
                                {errors.permissions && (
                                    <p className="text-sm text-destructive">{errors.permissions}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
