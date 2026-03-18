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
import { Plus, Search, Eye, Pencil, Trash2, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { Supplier, PaginatedData } from '@/types';

interface Props {
    suppliers: PaginatedData<Supplier & { purchase_orders_count: number }>;
    filters: { search?: string; status?: string };
}

export default function SupplierIndex({ suppliers, filters }: Props) {
    const confirm = useConfirm();
    const [search, setSearch] = useState(filters.search ?? '');
    const debouncedSearch = useDebounce(search, 300);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    const form = useForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true as boolean,
    });

    useEffect(() => {
        router.get(
            route('suppliers.index'),
            { search: debouncedSearch || undefined, status: filters.status || undefined },
            { preserveState: true, replace: true }
        );
    }, [debouncedSearch]);

    const handleStatusFilter = (value: string) => {
        router.get(
            route('suppliers.index'),
            { search: search || undefined, status: value === 'all' ? undefined : value },
            { preserveState: true, replace: true }
        );
    };

    const openCreate = () => {
        setEditingSupplier(null);
        form.setData({ name: '', contact_person: '', phone: '', email: '', address: '', notes: '', is_active: true });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        form.setData({
            name: supplier.name,
            contact_person: supplier.contact_person ?? '',
            phone: supplier.phone ?? '',
            email: supplier.email ?? '',
            address: supplier.address ?? '',
            notes: supplier.notes ?? '',
            is_active: supplier.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            form.put(route('suppliers.update', editingSupplier.id), { onSuccess: () => setDialogOpen(false) });
        } else {
            form.post(route('suppliers.store'), { onSuccess: () => setDialogOpen(false) });
        }
    };

    const handleDelete = async (supplier: Supplier) => {
        const ok = await confirm({
            title: 'Delete Supplier',
            description: `Delete supplier "${supplier.name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('suppliers.destroy', supplier.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Suppliers" />

            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        Suppliers
                    </h1>
                    <PermissionGate permission="suppliers.create">
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-1.5" /> New Supplier
                        </Button>
                    </PermissionGate>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            className="pl-9"
                            placeholder="Search suppliers…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
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
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">POs</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.data.map((supplier) => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>{supplier.contact_person ?? '—'}</TableCell>
                                        <TableCell>{supplier.phone ?? '—'}</TableCell>
                                        <TableCell>{supplier.email ?? '—'}</TableCell>
                                        <TableCell className="text-center">{supplier.purchase_orders_count}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={supplier.is_active ? 'success' : 'secondary'}>
                                                {supplier.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <PermissionGate permission="suppliers.view">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View" asChild>
                                                        <Link href={route('suppliers.show', supplier.id)}><Eye className="h-4 w-4" /></Link>
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="suppliers.edit">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(supplier)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="suppliers.delete">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(supplier)}>
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

                <Pagination data={suppliers} />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? `Edit: ${editingSupplier.name}` : 'New Supplier'}</DialogTitle>
                    </DialogHeader>
                    <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="s_name">Name *</Label>
                            <Input id="s_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                            {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s_contact">Contact Person</Label>
                            <Input id="s_contact" value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="s_phone">Phone</Label>
                                <Input id="s_phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                                {form.errors.phone && <p className="text-sm text-destructive">{form.errors.phone}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="s_email">Email</Label>
                                <Input id="s_email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s_address">Address</Label>
                            <Textarea id="s_address" value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} rows={2} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="s_notes">Notes</Label>
                            <Textarea id="s_notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="s_active" checked={form.data.is_active} onCheckedChange={(v) => form.setData('is_active', !!v)} />
                            <Label htmlFor="s_active">Active</Label>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="supplier-form" disabled={form.processing}>
                            {form.processing ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Save Supplier'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
