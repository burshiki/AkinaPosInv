import { useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { Input } from '@/Components/ui/input';
import { Settings, Database, Download, Upload, AlertTriangle } from 'lucide-react';
import { PermissionGate } from '@/Components/app/permission-gate';

interface Props {
    receipt_note: string;
}

export default function SettingsIndex({ receipt_note }: Props) {
    const form = useForm({ receipt_note });
    const restoreForm = useForm<{ backup_file: File | null }>({ backup_file: null });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('settings.update'));
    }

    function handleRestoreSubmit(e: React.FormEvent) {
        e.preventDefault();
        restoreForm.post(route('backup.restore'), {
            forceFormData: true,
            onSuccess: () => {
                restoreForm.reset();
                setFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    }

    return (
        <AuthenticatedLayout>
            <Head title="Settings" />

            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <h1 className="text-xl font-semibold">Settings</h1>
                </div>

                {/* Receipt Settings */}
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

                {/* Database Backup */}
                <PermissionGate permission="settings.manage">
                    <div className="space-y-6 rounded-lg border p-6">
                        <h2 className="font-medium text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Database Backup
                        </h2>

                        {/* Download */}
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Download a full SQL backup of the current database.
                            </p>
                            <Button asChild variant="outline">
                                <a href={route('backup.download')}>
                                    <Download className="h-4 w-4 mr-1.5" />
                                    Download Backup
                                </a>
                            </Button>
                        </div>

                        <hr />

                        {/* Restore */}
                        <form onSubmit={handleRestoreSubmit} className="space-y-3">
                            <p className="text-sm font-medium">Restore from Backup</p>

                            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Warning:</strong> Restoring will overwrite all current data. This cannot be undone.
                                    Download the current backup first before restoring.
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="backup_file">Select .sql backup file</Label>
                                <Input
                                    ref={fileInputRef}
                                    id="backup_file"
                                    type="file"
                                    accept=".sql"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        restoreForm.setData('backup_file', file);
                                        setFileName(file?.name ?? '');
                                    }}
                                />
                                {restoreForm.errors.backup_file && (
                                    <p className="text-sm text-destructive">{restoreForm.errors.backup_file}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="outline"
                                className="border-orange-400 text-orange-700 hover:bg-orange-50"
                                disabled={restoreForm.processing || !fileName}
                            >
                                <Upload className="h-4 w-4 mr-1.5" />
                                {restoreForm.processing ? 'Restoring…' : 'Restore Backup'}
                            </Button>
                        </form>
                    </div>
                </PermissionGate>
            </div>
        </AuthenticatedLayout>
    );
}
