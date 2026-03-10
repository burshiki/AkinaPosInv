import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function PeriodCreate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthName = now.toLocaleString('default', { month: 'long' });

    const { data, setData, post, processing, errors } = useForm({
        name: `${monthName} ${y} Payroll`,
        period_start: new Date(y, m, 1).toISOString().split('T')[0],
        period_end: new Date(y, m + 1, 0).toISOString().split('T')[0],
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('payroll-periods.store'));
    };

    return (
        <AuthenticatedLayout header="New Payroll Period">
            <Head title="New Payroll Period" />
            <div className="mx-auto max-w-lg space-y-4">
                <Button variant="outline" size="sm" asChild>
                    <Link href={route('payroll-periods.index')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                </Button>
                <Card>
                    <CardHeader><CardTitle>Create Payroll Period</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Start Date *</Label>
                                    <Input type="date" value={data.period_start} onChange={(e) => setData('period_start', e.target.value)} />
                                    {errors.period_start && <p className="text-sm text-destructive">{errors.period_start}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date *</Label>
                                    <Input type="date" value={data.period_end} onChange={(e) => setData('period_end', e.target.value)} />
                                    {errors.period_end && <p className="text-sm text-destructive">{errors.period_end}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} />
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={processing}>Create Period</Button>
                                <Button variant="outline" asChild><Link href={route('payroll-periods.index')}>Cancel</Link></Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
