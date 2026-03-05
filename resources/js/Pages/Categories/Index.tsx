import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';

import { Badge } from '@/Components/ui/badge';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/Components/app/confirm-dialog';
import type { Category } from '@/types';

interface Props {
    categories: Category[];
}

export default function CategoriesIndex({ categories }: Props) {
    const confirm = useConfirm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const form = useForm({
        name: '',
        description: '',
        sort_order: '0',
        is_active: true,
    });

    const openCreateDialog = () => {
        setEditingCategory(null);
        form.setData({ name: '', description: '', sort_order: '0', is_active: true });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEditDialog = (category: Category) => {
        setEditingCategory(category);
        form.setData({
            name: category.name,
            description: category.description ?? '',
            sort_order: String(category.sort_order),
            is_active: category.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            form.put(route('categories.update', editingCategory.id), {
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post(route('categories.store'), {
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const handleDelete = async (category: Category) => {
        const ok = await confirm({
            title: 'Delete Category',
            description: `Are you sure you want to delete "${category.name}"?`,
            confirmLabel: 'Delete',
            variant: 'destructive',
        });
        if (!ok) return;
        router.delete(route('categories.destroy', category.id));
    };

    return (
        <AuthenticatedLayout header="Categories">
            <Head title="Categories" />

            <div className="space-y-4">
                <div className="flex justify-end">
                    <PermissionGate permission="inventory.create">
                        <Button onClick={openCreateDialog}>
                            <Plus className="mr-2 h-4 w-4" /> Add Category
                        </Button>
                    </PermissionGate>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Sort Order</TableHead>
                                <TableHead className="text-center">Products</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No categories found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{category.description || '—'}</TableCell>
                                        <TableCell className="text-center">{category.sort_order}</TableCell>
                                        <TableCell className="text-center">{category.products_count ?? 0}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={category.is_active ? 'success' : 'secondary'}>
                                                {category.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <PermissionGate permission="inventory.edit">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEditDialog(category)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                                <PermissionGate permission="inventory.delete">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => handleDelete(category)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </PermissionGate>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat_name">Name *</Label>
                            <Input id="cat_name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                            {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat_desc">Description</Label>
                            <Textarea id="cat_desc" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cat_sort">Sort Order</Label>
                            <Input id="cat_sort" type="number" value={form.data.sort_order} onChange={(e) => form.setData('sort_order', e.target.value)} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
