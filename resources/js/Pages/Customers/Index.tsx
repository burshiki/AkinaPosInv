import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { useDebounce } from '@/hooks/use-debounce';
import { Plus, Search, Eye, Pencil, Trash2, CreditCard, Banknote, Users, Upload } from 'lucide-react';
import CustomerBatchUploadModal from './BatchUploadModal';
import { useState, useEffect } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { Customer, PaginatedData } from '@/types';

interface Props {
    customers: PaginatedData<Customer>;
    filters: { search?: string; status?: string };
}

export default function CustomersIndex({ customers, filters }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [batchUploadOpen, setBatchUploadOpen] = useState(false);

    const [debtDialogOpen, setDebtDialogOpen] = useState(false);
    const [debtCustomer, setDebtCustomer] = useState<Customer | null>(null);
    const debtForm = useForm({ amount: '', due_date: '', notes: '' });

    const openInitialDebt = (customer: Customer) => {
        setDebtCustomer(customer);
        debtForm.setData({ amount: '', due_date: '', notes: '' });
        debtForm.clearErrors();
        setDebtDialogOpen(true);
    };

    const handleDebtSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!debtCustomer) return;
        debtForm.post(route('customers.initial-debt', debtCustomer.id), {
            onSuccess: () => setDebtDialogOpen(false),
        });
    };

    const form = useForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true as boolean,
    });

    useEffect(() => {
        router.get(
            route('customers.index'),
            { search: debouncedSearch || undefined, status: filters.status || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleStatusFilter = (value: string) => {
        router.get(
            route('customers.index'),
            { search: search || undefined, status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const openCreate = () => {
        setEditingCustomer(null);
        form.setData({ name: '', phone: '', email: '', address: '', notes: '', is_active: true });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        form.setData({
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            address: customer.address ?? '',
            notes: customer.notes ?? '',
            is_active: customer.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            form.put(route('customers.update', editingCustomer.id), { onSuccess: () => setDialogOpen(false) });
        } else {
            form.post(route('customers.store'), { onSuccess: () => setDialogOpen(false) });
        }
    };

    const handleDelete = async (customer: Customer) => {
        const ok = await confirm({
            title: 'Delete Customer',
            description: `Delete customer "${customer.name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('customers.destroy', customer.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Customers" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        Customers
                    </h1>
                    <div className="flex items-center gap-2">
                        <PermissionGate permission="customers.create">
                            <Button variant="outline" onClick={() => setBatchUploadOpen(true)}>
                                <Upload className="h-4 w-4 mr-1.5" /> Batch Upload
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission="customers.create">
                            <Button onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-1.5" /> Add Customer
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={filters.status ?? 'all'} onValueChange={handleStatusFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <PermissionGate permission="debts.view">
                        <Button variant="outline" asChild>
                            <Link href={route('debts.index')}>
                                <CreditCard className="mr-2 h-4 w-4" /> All Debts
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No customers found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.data.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell>{customer.phone ?? '—'}</TableCell>
                                        <TableCell>{customer.email ?? '—'}</TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {customer.address ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customer.is_active ? 'success' : 'secondary'}>
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="View" asChild>
                                                    <Link href={route('customers.show', customer.id)}><Eye className="h-4 w-4" /></Link>
                                                </Button>
                                                <PermissionGate permission="debts.view">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View Debts" asChild>
                                                        <Link href={route('debts.show', customer.name)}><CreditCard className="h-4 w-4" /></Link>
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="debts.create">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Add Initial Debt" onClick={() => openInitialDebt(customer)}>
                                                            <Banknote className="h-4 w-4" />
                                                        </Button>
                                                    </PermissionGate>
                                                    <PermissionGate permission="customers.edit">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(customer)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="customers.delete">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(customer)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>                    </ScrollArea>                </div>

                <Pagination data={customers} />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingCustomer ? `Edit: ${editingCustomer.name}` : 'New Customer'}</DialogTitle>
                    </DialogHeader>
                    <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="c_name">Name *</Label>
                            <Input id="c_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                            {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="c_phone">Phone</Label>
                                <Input id="c_phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                {form.errors.phone && <p className="text-sm text-destructive">{form.errors.phone}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="c_email">Email</Label>
                                <Input id="c_email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_address">Address</Label>
                            <Textarea id="c_address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} rows={2} />
                            {form.errors.address && <p className="text-sm text-destructive">{form.errors.address}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c_notes">Notes</Label>
                            <Textarea id="c_notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="c_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', !!v)} />
                            <Label htmlFor="c_active">Active</Label>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="customer-form" disabled={form.processing}>
                            {form.processing ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Save Customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Initial Debt Dialog */}
            <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Initial Debt — {debtCustomer?.name}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Record an outstanding balance carried over from your previous POS system.
                    </p>
                    <form id="debt-form" onSubmit={handleDebtSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="d_amount">Amount *</Label>
                            <Input
                                id="d_amount"
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                value={debtForm.data.amount}
                                onChange={(e) => debtForm.setData('amount', e.target.value)}
                            />
                            {debtForm.errors.amount && <p className="text-sm text-destructive">{debtForm.errors.amount}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="d_due_date">Due Date</Label>
                            <Input
                                id="d_due_date"
                                type="date"
                                value={debtForm.data.due_date}
                                onChange={(e) => debtForm.setData('due_date', e.target.value)}
                            />
                            {debtForm.errors.due_date && <p className="text-sm text-destructive">{debtForm.errors.due_date}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="d_notes">Notes</Label>
                            <Textarea
                                id="d_notes"
                                placeholder="Initial balance migrated from previous POS"
                                value={debtForm.data.notes}
                                onChange={(e) => debtForm.setData('notes', e.target.value)}
                                rows={2}
                            />
                            {debtForm.errors.notes && <p className="text-sm text-destructive">{debtForm.errors.notes}</p>}
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDebtDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="debt-form" disabled={debtForm.processing}>
                            {debtForm.processing ? 'Saving...' : 'Add Debt'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CustomerBatchUploadModal
                open={batchUploadOpen}
                onClose={() => setBatchUploadOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
