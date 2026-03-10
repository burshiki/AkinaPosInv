import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { useState, FormEvent } from 'react';
import type { HolidayEntry } from '@/types';

interface Props {
    holidays: HolidayEntry[];
    year: number;
}

type HolidayType = 'regular' | 'special_non_working' | 'special_working';

const TYPE_LABELS: Record<HolidayType, string> = {
    regular: 'Regular Holiday',
    special_non_working: 'Special Non-Working',
    special_working: 'Special Working',
};

const TYPE_BADGE: Record<HolidayType, 'default' | 'secondary' | 'outline'> = {
    regular: 'default',
    special_non_working: 'secondary',
    special_working: 'outline',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

export default function HolidaysIndex({ holidays, year }: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<HolidayEntry | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<HolidayEntry | null>(null);

    // Add form
    const addForm = useForm<{ date: string; name: string; type: HolidayType }>({
        date: '',
        name: '',
        type: 'regular',
    });

    // Edit form
    const editForm = useForm<{ date: string; name: string; type: HolidayType }>({
        date: '',
        name: '',
        type: 'regular',
    });

    const changeYear = (y: string) => {
        router.get(route('holidays.index'), { year: y }, { preserveState: false });
    };

    const openAdd = () => {
        addForm.reset();
        setAddOpen(true);
    };

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();
        addForm.post(route('holidays.store'), {
            onSuccess: () => setAddOpen(false),
        });
    };

    const openEdit = (h: HolidayEntry) => {
        editForm.setData({ date: h.date.slice(0, 10), name: h.name, type: h.type });
        setEditTarget(h);
    };

    const submitEdit = (e: FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        editForm.put(route('holidays.update', editTarget.id), {
            onSuccess: () => setEditTarget(null),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('holidays.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AuthenticatedLayout header="Holidays">
            <Head title="Holidays" />

            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Select value={String(year)} onValueChange={changeYear}>
                            <SelectTrigger className="w-28">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {YEAR_OPTIONS.map((y) => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <PermissionGate permission="payroll.process">
                        <Button onClick={openAdd}>
                            <Plus className="mr-2 h-4 w-4" /> Add Holiday
                        </Button>
                    </PermissionGate>
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Public Holidays — {year}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <PermissionGate permission="payroll.process">
                                        <TableHead className="text-right">Actions</TableHead>
                                    </PermissionGate>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holidays.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No holidays recorded for {year}.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    holidays.map((h) => (
                                        <TableRow key={h.id}>
                                            <TableCell className="font-medium">
                                                {new Date(h.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-PH', {
                                                    weekday: 'short', month: 'short', day: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell>{h.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={TYPE_BADGE[h.type]}>
                                                    {TYPE_LABELS[h.type]}
                                                </Badge>
                                            </TableCell>
                                            <PermissionGate permission="payroll.process">
                                                <TableCell className="text-right space-x-1">
                                                    <Button size="icon" variant="ghost" onClick={() => openEdit(h)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(h)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </PermissionGate>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Add Dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Holiday</DialogTitle>
                    </DialogHeader>
                    <form id="add-holiday-form" onSubmit={submitAdd} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="add-date">Date</Label>
                            <Input
                                id="add-date"
                                type="date"
                                value={addForm.data.date}
                                onChange={(e) => addForm.setData('date', e.target.value)}
                            />
                            {addForm.errors.date && <p className="text-sm text-destructive">{addForm.errors.date}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="add-name">Name</Label>
                            <Input
                                id="add-name"
                                value={addForm.data.name}
                                onChange={(e) => addForm.setData('name', e.target.value)}
                                placeholder="e.g. New Year's Day"
                            />
                            {addForm.errors.name && <p className="text-sm text-destructive">{addForm.errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="add-type">Type</Label>
                            <Select value={addForm.data.type} onValueChange={(v) => addForm.setData('type', v as HolidayType)}>
                                <SelectTrigger id="add-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Regular Holiday</SelectItem>
                                    <SelectItem value="special_non_working">Special Non-Working</SelectItem>
                                    <SelectItem value="special_working">Special Working</SelectItem>
                                </SelectContent>
                            </Select>
                            {addForm.errors.type && <p className="text-sm text-destructive">{addForm.errors.type}</p>}
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button type="submit" form="add-holiday-form" disabled={addForm.processing}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Holiday</DialogTitle>
                    </DialogHeader>
                    <form id="edit-holiday-form" onSubmit={submitEdit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="edit-date">Date</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={editForm.data.date}
                                onChange={(e) => editForm.setData('date', e.target.value)}
                            />
                            {editForm.errors.date && <p className="text-sm text-destructive">{editForm.errors.date}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            {editForm.errors.name && <p className="text-sm text-destructive">{editForm.errors.name}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="edit-type">Type</Label>
                            <Select value={editForm.data.type} onValueChange={(v) => editForm.setData('type', v as HolidayType)}>
                                <SelectTrigger id="edit-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Regular Holiday</SelectItem>
                                    <SelectItem value="special_non_working">Special Non-Working</SelectItem>
                                    <SelectItem value="special_working">Special Working</SelectItem>
                                </SelectContent>
                            </Select>
                            {editForm.errors.type && <p className="text-sm text-destructive">{editForm.errors.type}</p>}
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
                        <Button type="submit" form="edit-holiday-form" disabled={editForm.processing}>Update</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Holiday</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
