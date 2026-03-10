import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { Separator } from '@/Components/ui/separator';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { User } from '@/types';

interface Props {
    users: (User & { permissions: string[] })[];
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

export default function UsersIndex({ users, allPermissions }: Props) {
    const confirm = useConfirm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<(User & { permissions: string[] }) | null>(null);

    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_admin: false as boolean,
        permissions: [] as string[],
    });

    const groups = allPermissions.reduce(
        (acc, perm) => {
            if (!acc[perm.group]) acc[perm.group] = [];
            acc[perm.group].push(perm.name);
            return acc;
        },
        {} as Record<string, string[]>,
    );

    const togglePermission = (permission: string) => {
        form.setData(
            'permissions',
            form.data.permissions.includes(permission)
                ? form.data.permissions.filter((p) => p !== permission)
                : [...form.data.permissions, permission],
        );
    };

    const toggleGroup = (groupPermissions: string[]) => {
        const allSelected = groupPermissions.every((p) => form.data.permissions.includes(p));
        if (allSelected) {
            form.setData('permissions', form.data.permissions.filter((p) => !groupPermissions.includes(p)));
        } else {
            form.setData('permissions', [...new Set([...form.data.permissions, ...groupPermissions])]);
        }
    };

    const openCreate = () => {
        setEditingUser(null);
        form.setData({ name: '', email: '', password: '', password_confirmation: '', is_admin: false, permissions: [] });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (user: User & { permissions: string[] }) => {
        setEditingUser(user);
        form.setData({
            name: user.name,
            email: user.email,
            password: '',
            password_confirmation: '',
            is_admin: user.is_admin,
            permissions: user.permissions || [],
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            form.put(route('users.update', editingUser.id), { onSuccess: () => setDialogOpen(false) });
        } else {
            form.post(route('users.store'), { onSuccess: () => setDialogOpen(false) });
        }
    };

    const deleteUser = async (id: number) => {
        const ok = await confirm({
            title: 'Delete User',
            description: 'Are you sure you want to delete this user?',
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('users.destroy', id));
    };

    return (
        <AuthenticatedLayout header="Users">
            <Head title="Users" />

            <div className="space-y-4">
                <div className="flex justify-end">
                    <PermissionGate permission="users.create">
                        <Button onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </PermissionGate>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            {user.is_admin ? (
                                                <Badge>Admin</Badge>
                                            ) : (
                                                <Badge variant="secondary">Staff</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.is_admin ? (
                                                <span className="text-sm text-muted-foreground">All permissions</span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    {user.permissions?.length ?? 0} assigned
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(user.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <PermissionGate permission="users.edit">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(user)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="users.delete">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => deleteUser(user.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? `Edit: ${editingUser.name}` : 'New User'}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <form id="user-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
                            <div className="space-y-2">
                                <Label htmlFor="u_name">Name *</Label>
                                <Input id="u_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="u_email">Email *</Label>
                                <Input id="u_email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="u_pw">{editingUser ? 'New Password' : 'Password *'}</Label>
                                    <Input
                                        id="u_pw"
                                        name="u_pw"
                                        type="password"
                                        autoComplete="new-password"
                                        value={form.data.password}
                                        onChange={(e) => form.setData('password', e.target.value)}
                                        placeholder={editingUser ? 'Leave blank to keep current' : ''}
                                    />
                                    {form.errors.password && <p className="text-sm text-destructive">{form.errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="u_pwc">Confirm Password</Label>
                                    <Input
                                        id="u_pwc"
                                        name="u_pwc"
                                        type="password"
                                        autoComplete="new-password"
                                        value={form.data.password_confirmation}
                                        onChange={(e) => form.setData('password_confirmation', e.target.value)}
                                    />
                                    {form.errors.password_confirmation && <p className="text-sm text-destructive">{form.errors.password_confirmation}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox id="u_admin" checked={form.data.is_admin} onCheckedChange={(v) => form.setData('is_admin', !!v)} />
                                <Label htmlFor="u_admin" className="cursor-pointer">
                                    Administrator (full access to all features)
                                </Label>
                            </div>

                            {!form.data.is_admin && (
                                <div className="space-y-3 rounded-md border p-4">
                                    <p className="text-sm font-semibold">Permissions</p>
                                    {Object.entries(groups).map(([group, permissions]) => (
                                        <div key={group}>
                                            <div className="mb-2 flex items-center gap-2">
                                                <Checkbox
                                                    id={`grp-${group}`}
                                                    checked={permissions.every((p) => form.data.permissions.includes(p))}
                                                    onCheckedChange={() => toggleGroup(permissions)}
                                                />
                                                <Label htmlFor={`grp-${group}`} className="cursor-pointer font-bold capitalize">{group}</Label>
                                            </div>
                                            <div className="ml-6 grid gap-2 sm:grid-cols-2">
                                                {permissions.map((perm) => (
                                                    <div key={perm} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`p-${perm}`}
                                                            checked={form.data.permissions.includes(perm)}
                                                            onCheckedChange={() => togglePermission(perm)}
                                                        />
                                                        <Label htmlFor={`p-${perm}`} className="cursor-pointer text-sm">
                                                            {permissionLabels[perm] || perm}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                            <Separator className="mt-3" />
                                        </div>
                                    ))}
                                    {form.errors.permissions && <p className="text-sm text-destructive">{form.errors.permissions}</p>}
                                </div>
                            )}
                        </form>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="user-form" disabled={form.processing}>
                            {form.processing ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
