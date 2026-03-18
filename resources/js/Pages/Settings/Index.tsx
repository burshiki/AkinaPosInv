import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Settings } from 'lucide-react';

interface Props {
    receipt_note: string;
}

export default function SettingsIndex({ receipt_note }: Props) {
    const form = useForm({ receipt_note });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('settings.update'));
    }

    return (
        <AuthenticatedLayout>
            <Head title="Settings" />

            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <h1 className="text-xl font-semibold">Settings</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
                    <h2 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Receipt</h2>

                    <div className="space-y-2">
                        <Label htmlFor="receipt_note">Receipt Note</Label>
                        <Textarea
                            id="receipt_note"
                            rows={4}
                            placeholder="e.g. No return, no exchange. Thank you for shopping with us!"
                            value={form.data.receipt_note}
                            onChange={(e) => form.setData('receipt_note', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This note appears at the bottom of every printed receipt. Leave blank to hide.
                        </p>
                        {form.errors.receipt_note && (
                            <p className="text-xs text-destructive">{form.errors.receipt_note}</p>
                        )}
                    </div>

                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Saving...' : 'Save Settings'}
                    </Button>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
