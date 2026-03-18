import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { Pagination } from '@/Components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Plus, Eye, Calendar } from 'lucide-react';
import { formatDateOnly } from '@/lib/utils';
import { useState } from 'react';
import type { PayrollPeriod, PaginatedData } from '@/types';

interface Props {
    periods: PaginatedData<PayrollPeriod & { created_by_user?: { name: string } }>;
}

const STATUS_CFG: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
    paid:   'success',
    locked: 'secondary',
    open:   'outline',
};

export default function PeriodsIndex({ periods }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const periodForm = useForm({
        name: '',
        period_start: '',
        period_end: '',
        notes: '',
    });

    const openCreate = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const monthName = now.toLocaleString('default', { month: 'long' });
        periodForm.setData({
            name: `${monthName} ${y} Payroll`,
            period_start: new Date(y, m, 1).toISOString().split('T')[0],
            period_end: new Date(y, m + 1, 0).toISOString().split('T')[0],
            notes: '',
        });
        periodForm.clearErrors();
        setCreateOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        periodForm.post(route('payroll-periods.store'), { onSuccess: () => setCreateOpen(false) });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Payroll Periods" />
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Calendar className="h-6 w-6" />
                        Payroll Periods
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('employees.index')}>Employees</Link>
                        </Button>
                        <PermissionGate permission="payroll.process">
                            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /> New Period</Button>
                        </PermissionGate>
                    </div>
                </div>

                <div className="rounded-md border">
                    <ScrollArea>
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
                                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No payroll periods yet</TableCell></TableRow>
                            ) : periods.data.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-sm">{formatDateOnly(p.period_start)} — {formatDateOnly(p.period_end)}</TableCell>
                                    <TableCell>{p.payroll_records_count ?? 0}</TableCell>
                                    <TableCell><Badge variant={STATUS_CFG[p.status] ?? 'outline'}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</Badge></TableCell>
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
                    </ScrollArea>
                </div>
                <Pagination data={periods} />
            </div>

            {/* Create Payroll Period Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" /> New Payroll Period
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="period_name">Name *</Label>
                            <Input
                                id="period_name"
                                value={periodForm.data.name}
                                onChange={(e) => periodForm.setData('name', e.target.value)}
                                autoFocus
                            />
                            {periodForm.errors.name && <p className="text-sm text-destructive">{periodForm.errors.name}</p>}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="period_start">Start Date *</Label>
                                <Input
                                    id="period_start"
                                    type="date"
                                    value={periodForm.data.period_start}
                                    onChange={(e) => periodForm.setData('period_start', e.target.value)}
                                />
                                {periodForm.errors.period_start && <p className="text-sm text-destructive">{periodForm.errors.period_start}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="period_end">End Date *</Label>
                                <Input
                                    id="period_end"
                                    type="date"
                                    value={periodForm.data.period_end}
                                    onChange={(e) => periodForm.setData('period_end', e.target.value)}
                                />
                                {periodForm.errors.period_end && <p className="text-sm text-destructive">{periodForm.errors.period_end}</p>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="period_notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                            <Textarea
                                id="period_notes"
                                value={periodForm.data.notes}
                                onChange={(e) => periodForm.setData('notes', e.target.value)}
                                rows={2}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={periodForm.processing}>
                                {periodForm.processing ? 'Creating...' : 'Create Period'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
