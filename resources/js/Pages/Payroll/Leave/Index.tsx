import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { PermissionGate } from '@/Components/app/permission-gate';
import { Plus, Check, X, CalendarDays, Banknote, Info, AlertCircle } from 'lucide-react';
import { useState, FormEvent, useMemo } from 'react';
import type { LeaveRequest, LeaveType, PaginatedData } from '@/types';

interface EmployeeOption {
    id: number;
    first_name: string;
    last_name: string;
    employee_number: string;
    hired_at: string | null;
}

interface SilBalance {
    employee_id: number;
    employee_name: string;
    total_days: number;
    used_days: number;
    cash_converted_days: number;
    unconverted_days: number;
    daily_rate: number;
    cash_equivalent: number;
}

interface BalanceSummary {
    employee_id: number;
    employee_name: string;
    leave_type_name: string;
    is_paid: boolean;
    total_days: number;
    used_days: number;
    cash_converted_days: number;
    remaining_days: number;
}

interface Props {
    requests: PaginatedData<LeaveRequest>;
    employees: EmployeeOption[];
    leaveTypes: LeaveType[];
    filters: { status?: string; employee_id?: string };
    silBalances: SilBalance[];
    silYear: number;
    leaveBalances: BalanceSummary[];
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
};

export default function LeaveIndex({ requests, employees, leaveTypes, filters, silBalances, silYear, leaveBalances }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [showReject, setShowReject] = useState<LeaveRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [silConvertYear, setSilConvertYear] = useState(String(silYear));

    const [form, setForm] = useState({
        employee_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        days_count: '',
        reason: '',
    });

    function applyFilters(key: string, value: string) {
        const params: Record<string, string | undefined> = {
            ...filters,
            [key]: value || undefined,
        };
        router.get(route('leave.index'), params, { preserveState: true });
    }

    function handleCreate(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.post(route('leave.store'), {
            employee_id: parseInt(form.employee_id),
            leave_type_id: parseInt(form.leave_type_id),
            start_date: form.start_date,
            end_date: form.end_date,
            days_count: parseFloat(form.days_count),
            reason: form.reason || null,
        }, {
            onSuccess: () => { setShowCreate(false); resetForm(); },
            onFinish: () => setProcessing(false),
        });
    }

    function handleApprove(req: LeaveRequest) {
        if (!confirm(`Approve ${req.days_count}-day leave for ${req.employee?.first_name} ${req.employee?.last_name}?`)) return;
        router.post(route('leave.approve', req.id));
    }

    function handleReject() {
        if (!showReject) return;
        setProcessing(true);
        router.post(route('leave.reject', showReject.id), {
            rejection_reason: rejectionReason || null,
        }, {
            onSuccess: () => { setShowReject(null); setRejectionReason(''); },
            onFinish: () => setProcessing(false),
        });
    }

    function resetForm() {
        setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', days_count: '', reason: '' });
    }

    function handleSilConvert(e: FormEvent) {
        e.preventDefault();
        setProcessing(true);
        router.post(route('leave.sil-convert'), { year: parseInt(silConvertYear) }, {
            onFinish: () => setProcessing(false),
        });
    }

    // SIL eligibility check for selected employee + leave type in the form
    const silEligibility = useMemo(() => {
        if (!form.employee_id || !form.leave_type_id) return null;
        const lt = leaveTypes.find((t) => String(t.id) === form.leave_type_id);
        if (!lt?.min_service_months) return null;
        const emp = employees.find((e) => String(e.id) === form.employee_id);
        if (!emp?.hired_at) return { eligible: false, months: 0, needed: lt.min_service_months, reason: 'Hire date not set' };
        const from = new Date(emp.hired_at);
        const to = form.start_date ? new Date(form.start_date) : new Date();
        const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
        return {
            eligible: months >= lt.min_service_months,
            months,
            needed: lt.min_service_months,
            reason: months < lt.min_service_months
                ? `${months} of ${lt.min_service_months} months required`
                : null,
        };
    }, [form.employee_id, form.leave_type_id, form.start_date, leaveTypes, employees]);

    // Auto-compute days_count when dates change
    function updateDates(startDate: string, endDate: string) {
        let days = '';
        if (startDate && endDate) {
            const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
            if (diff > 0) days = String(diff);
        }
        setForm((prev) => ({ ...prev, start_date: startDate, end_date: endDate, days_count: days || prev.days_count }));
    }

    return (
        <AuthenticatedLayout header="Leave Management">
            <Head title="Leave Management" />

            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex gap-2">
                        {['', 'pending', 'approved', 'rejected'].map((s) => (
                            <Button
                                key={s}
                                variant={(filters.status ?? '') === s ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => applyFilters('status', s)}
                            >
                                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={filters.employee_id ?? 'all'}
                            onValueChange={(v) => applyFilters('employee_id', v === 'all' ? '' : v)}
                        >
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder="Filter by employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={String(emp.id)}>
                                        {emp.first_name} {emp.last_name} ({emp.employee_number})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <PermissionGate permission="payroll.process">
                            <Button onClick={() => setShowCreate(true)}>
                                <Plus className="mr-2 h-4 w-4" /> File Leave
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Leave Requests Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead className="text-right">Days</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Approved By</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No leave requests found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    requests.data.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">
                                                {req.employee?.first_name} {req.employee?.last_name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    <CalendarDays className="mr-1 h-3 w-3" />
                                                    {req.leave_type?.name ?? '—'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {new Date(req.start_date).toLocaleDateString()} — {new Date(req.end_date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{req.days_count}</TableCell>
                                            <TableCell className="text-sm max-w-xs truncate">{req.reason ?? '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant={statusColors[req.status] ?? 'secondary'} className="capitalize">
                                                    {req.status}
                                                </Badge>
                                                {req.status === 'rejected' && req.rejection_reason && (
                                                    <p className="mt-0.5 text-xs text-destructive">{req.rejection_reason}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {req.approver?.name ?? '—'}
                                                {req.approved_at && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(req.approved_at).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {req.status === 'pending' && (
                                                    <PermissionGate permission="payroll.approve">
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600"
                                                                onClick={() => handleApprove(req)}
                                                                title="Approve"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => setShowReject(req)}
                                                                title="Reject"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </PermissionGate>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pagination */}
                {requests.last_page > 1 && (
                    <div className="flex justify-center gap-1">
                        {requests.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Leave Balance Summary */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                        Leave Balance Summary — {silYear}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Consumed vs. allocated days per employee for the current year. Balances are recorded when a leave request is approved.
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    {leaveBalances.length === 0 ? (
                        <p className="px-6 py-4 text-sm text-muted-foreground">No leave balances recorded for {silYear} yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead className="text-right">Allocated</TableHead>
                                    <TableHead className="text-right">Used</TableHead>
                                    <TableHead className="text-right">Converted</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead>Usage</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaveBalances.map((b, i) => {
                                    const usedPct = b.total_days > 0 ? Math.min(100, Math.round((b.used_days / b.total_days) * 100)) : 0;
                                    const low = b.remaining_days <= 1 && b.total_days > 0;
                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{b.employee_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {b.leave_type_name}
                                                    {!b.is_paid && <span className="ml-1 text-muted-foreground">· Unpaid</span>}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{b.total_days}d</TableCell>
                                            <TableCell className="text-right">{b.used_days}d</TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {b.cash_converted_days > 0 ? `${b.cash_converted_days}d` : '—'}
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold ${low ? 'text-destructive' : 'text-green-700'}`}>
                                                {b.remaining_days}d
                                            </TableCell>
                                            <TableCell className="w-36">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${
                                                                usedPct >= 100 ? 'bg-destructive' : usedPct >= 75 ? 'bg-amber-500' : 'bg-green-500'
                                                            }`}
                                                            style={{ width: `${usedPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 shrink-0 text-xs text-muted-foreground">{usedPct}%</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* SIL Year-End Cash Conversion */}
            <PermissionGate permission="payroll.process">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Banknote className="h-4 w-4 text-green-600" />
                            Year-End SIL Cash Conversion
                            <Badge variant="outline" className="text-xs font-normal">Labor Code Art. 95</Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Unused Service Incentive Leave must be converted to its cash equivalent at year-end.
                            Cash value = Daily Rate × Unused SIL Days.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {silBalances.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending SIL balances for {silYear}.</p>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead className="text-right">SIL Entitlement</TableHead>
                                            <TableHead className="text-right">Used</TableHead>
                                            <TableHead className="text-right">Converted</TableHead>
                                            <TableHead className="text-right">Remaining</TableHead>
                                            <TableHead className="text-right">Daily Rate</TableHead>
                                            <TableHead className="text-right">Cash Equivalent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {silBalances.map((b) => (
                                            <TableRow key={b.employee_id}>
                                                <TableCell className="font-medium">{b.employee_name}</TableCell>
                                                <TableCell className="text-right">{b.total_days}d</TableCell>
                                                <TableCell className="text-right">{b.used_days}d</TableCell>
                                                <TableCell className="text-right">{b.cash_converted_days}d</TableCell>
                                                <TableCell className="text-right font-semibold text-amber-600">{b.unconverted_days}d</TableCell>
                                                <TableCell className="text-right">₱{b.daily_rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-700">₱{b.cash_equivalent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2 font-bold">
                                            <TableCell colSpan={6} className="text-right">Total Cash Payout ({silBalances.length} employee{silBalances.length !== 1 ? 's' : ''})</TableCell>
                                            <TableCell className="text-right text-green-700">
                                                ₱{silBalances.reduce((s, b) => s + b.cash_equivalent, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                <form onSubmit={handleSilConvert} className="mt-4 flex items-end gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Year</Label>
                                        <Input
                                            type="number"
                                            min="2020"
                                            max="2100"
                                            value={silConvertYear}
                                            onChange={(e) => setSilConvertYear(e.target.value)}
                                            className="w-28"
                                        />
                                    </div>
                                    <Button type="submit" disabled={processing} variant="default" className="bg-green-700 hover:bg-green-800">
                                        <Banknote className="mr-2 h-4 w-4" />
                                        {processing ? 'Converting...' : 'Convert All to Cash'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </CardContent>
                </Card>
            </PermissionGate>

            {/* File Leave Dialog */}
            <Dialog open={showCreate} onOpenChange={(open) => { if (!open) setShowCreate(false); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>File Leave Request</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Employee *</Label>
                            <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                                <SelectContent>
                                    {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={String(emp.id)}>
                                            {emp.first_name} {emp.last_name} ({emp.employee_number})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Leave Type *</Label>
                            <Select value={form.leave_type_id} onValueChange={(v) => setForm({ ...form, leave_type_id: v })}>
                                <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                                <SelectContent>
                                    {leaveTypes.map((lt) => (
                                        <SelectItem key={lt.id} value={String(lt.id)}>
                                            {lt.name} ({lt.default_days_per_year} days/yr)
                                            {lt.is_paid ? ' · Paid' : ' · Unpaid'}
                                            {lt.min_service_months ? ` · ${lt.min_service_months}mo service req.` : ''}
                                            {lt.is_cash_convertible ? ' · Cash-convertible' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* SIL eligibility notice */}
                            {silEligibility && (
                                <div className={`flex items-start gap-2 rounded-md p-2 text-xs ${silEligibility.eligible ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                                    {silEligibility.eligible
                                        ? <Check className="mt-0.5 h-3 w-3 shrink-0" />
                                        : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                                    {silEligibility.eligible
                                        ? `Eligible — ${silEligibility.months} months of service`
                                        : `Not yet eligible: ${silEligibility.reason}`}
                                </div>
                            )}

                            {/* Cash-convertible notice */}
                            {leaveTypes.find((t) => String(t.id) === form.leave_type_id)?.is_cash_convertible && (
                                <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                    <Info className="h-3 w-3 shrink-0" />
                                    Unused days must be converted to cash at year-end (Labor Code Art. 95)
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date *</Label>
                                <Input
                                    type="date"
                                    value={form.start_date}
                                    onChange={(e) => updateDates(e.target.value, form.end_date)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date *</Label>
                                <Input
                                    type="date"
                                    value={form.end_date}
                                    onChange={(e) => updateDates(form.start_date, e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Number of Days *</Label>
                            <Input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={form.days_count}
                                onChange={(e) => setForm({ ...form, days_count: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Input
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                placeholder="Optional reason"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={processing || !form.employee_id || !form.leave_type_id || !form.start_date || !form.end_date || !form.days_count}
                            >
                                {processing ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={!!showReject} onOpenChange={(open) => { if (!open) { setShowReject(null); setRejectionReason(''); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Reject Leave Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Reject {showReject?.days_count}-day leave for{' '}
                            <span className="font-medium text-foreground">
                                {showReject?.employee?.first_name} {showReject?.employee?.last_name}
                            </span>?
                        </p>
                        <div className="space-y-2">
                            <Label>Reason for Rejection</Label>
                            <Input
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Optional reason"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowReject(null); setRejectionReason(''); }}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={processing}>
                            {processing ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
