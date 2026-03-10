import { useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Checkbox } from '@/Components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import type { Employee, User } from '@/types';

interface Props {
    open: boolean;
    onClose: () => void;
    employee: Employee;
    users: Pick<User, 'id' | 'name' | 'email'>[];
}

export default function EmployeeEditModal({ open, onClose, employee, users }: Props) {
    const { data, setData, put, processing, errors, reset } = useForm({
        user_id: employee.user_id ? String(employee.user_id) : '',
        employee_number: employee.employee_number,
        first_name: employee.first_name,
        last_name: employee.last_name,
        middle_name: employee.middle_name ?? '',
        position: employee.position ?? '',
        department: employee.department ?? '',
        pay_type: employee.pay_type,
        basic_salary: String(employee.basic_salary),
        standard_work_days: String(employee.standard_work_days),
        monthly_divisor: String(employee.monthly_divisor),
        hired_at: employee.hired_at,
        separated_at: employee.separated_at ?? '',
        sss_number: employee.sss_number ?? '',
        philhealth_number: employee.philhealth_number ?? '',
        pagibig_number: employee.pagibig_number ?? '',
        tin: employee.tin ?? '',
        tax_status: employee.tax_status ?? 'S',
        phone: employee.phone ?? '',
        address: employee.address ?? '',
        is_active: employee.is_active,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('employees.update', employee.id), { onSuccess: () => onClose() });
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 pr-1">
                    <form id="employee-edit-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Info</h3>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>First Name *</Label>
                                        <Input value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} />
                                        {errors.first_name && <p className="text-sm text-destructive">{errors.first_name}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Middle Name</Label>
                                        <Input value={data.middle_name} onChange={(e) => setData('middle_name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name *</Label>
                                        <Input value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                                        {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Employee Number *</Label>
                                        <Input value={data.employee_number} onChange={(e) => setData('employee_number', e.target.value)} />
                                        {errors.employee_number && <p className="text-sm text-destructive">{errors.employee_number}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Link to System User</Label>
                                        <Select value={data.user_id || 'none'} onValueChange={(v) => setData('user_id', v === 'none' ? '' : v)}>
                                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {users.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Position</Label>
                                        <Input value={data.position} onChange={(e) => setData('position', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Department</Label>
                                        <Input value={data.department} onChange={(e) => setData('department', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Phone</Label>
                                        <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date Hired *</Label>
                                        <Input type="date" value={data.hired_at} onChange={(e) => setData('hired_at', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date Separated</Label>
                                    <Input type="date" value={data.separated_at} onChange={(e) => setData('separated_at', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Address</Label>
                                    <Textarea value={data.address} onChange={(e) => setData('address', e.target.value)} rows={2} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Compensation</h3>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Pay Type *</Label>
                                        <Select value={data.pay_type} onValueChange={(v) => setData('pay_type', v as 'monthly' | 'daily')}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">Monthly</SelectItem>
                                                <SelectItem value="daily">Daily</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{data.pay_type === 'monthly' ? 'Monthly Salary' : 'Daily Rate'} *</Label>
                                        <Input type="number" step="0.01" value={data.basic_salary} onChange={(e) => setData('basic_salary', e.target.value)} />
                                        {errors.basic_salary && <p className="text-sm text-destructive">{errors.basic_salary}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{data.pay_type === 'daily' ? 'Standard Work Days/mo' : 'Monthly Divisor'}</Label>
                                        <Input type="number"
                                            value={data.pay_type === 'daily' ? data.standard_work_days : data.monthly_divisor}
                                            onChange={(e) => setData(data.pay_type === 'daily' ? 'standard_work_days' : 'monthly_divisor', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Government IDs</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2"><Label>SSS Number</Label><Input value={data.sss_number} onChange={(e) => setData('sss_number', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>PhilHealth Number</Label><Input value={data.philhealth_number} onChange={(e) => setData('philhealth_number', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Pag-IBIG Number</Label><Input value={data.pagibig_number} onChange={(e) => setData('pagibig_number', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>TIN</Label><Input value={data.tin} onChange={(e) => setData('tin', e.target.value)} /></div>
                                </div>
                                <div className="space-y-2 max-w-[200px]">
                                    <Label>Tax Status</Label>
                                    <Select value={data.tax_status} onValueChange={(v) => setData('tax_status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="S">S (Single)</SelectItem>
                                            <SelectItem value="ME">ME (Married)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox id="edit_is_active" checked={data.is_active} onCheckedChange={(v) => setData('is_active', !!v)} />
                                <Label htmlFor="edit_is_active">Active</Label>
                            </div>
                    </form>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={processing}>Cancel</Button>
                    <Button type="submit" form="employee-edit-form" disabled={processing}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
