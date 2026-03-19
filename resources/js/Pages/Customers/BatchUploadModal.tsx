import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { ScrollArea } from '@/Components/ui/scroll-area';
import { router } from '@inertiajs/react';
import { Upload, Users, Download, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ImportResult {
    success: boolean;
    message?: string;
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CustomerBatchUploadModal({ open, onClose }: Props) {
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const ACCEPTED = ['.csv', '.xlsx', '.xls'];
    const MAX_MB = 5;

    const handleClose = () => {
        if (uploading) return;
        setFile(null);
        setResult(null);
        setDragging(false);
        onClose();
    };

    const pickFile = (picked: File | null) => {
        if (!picked) return;
        const ext = '.' + picked.name.split('.').pop()?.toLowerCase();
        if (!ACCEPTED.includes(ext)) {
            alert('Please select a CSV or Excel file (.csv, .xlsx, .xls).');
            return;
        }
        if (picked.size > MAX_MB * 1024 * 1024) {
            alert(`File size must be under ${MAX_MB} MB.`);
            return;
        }
        setFile(picked);
        setResult(null);
    };

    const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
    const onDragLeave = useCallback(() => setDragging(false), []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        pickFile(e.dataTransfer.files[0] ?? null);
    }, []);

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        pickFile(e.target.files?.[0] ?? null);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);

        const csrfToken = decodeURIComponent(
            document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''
        );

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(route('customers.import'), {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: formData,
            });

            let data: ImportResult;
            try {
                data = await res.json();
            } catch {
                data = { success: false, message: `Server error (${res.status}).`, imported: 0, updated: 0, skipped: 0, errors: [] };
            }
            if (!Array.isArray(data.errors)) data.errors = [];
            setResult(data);

            if (data.success && (data.imported > 0 || data.updated > 0)) {
                router.reload({ only: ['customers'] });
            }
        } catch {
            setResult({ success: false, message: 'Network error — please try again.', imported: 0, updated: 0, skipped: 0, errors: [] });
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setResult(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Batch Upload Customers
                    </DialogTitle>
                    <DialogDescription>
                        Import multiple customers at once from a CSV or Excel file.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Info + template download */}
                    <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1.5">
                        <p className="font-medium">Accepted columns</p>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            <code>name</code> (required),{' '}
                            <code>phone</code>, <code>email</code>, <code>address</code>,{' '}
                            <code>notes</code>, <code>is_active</code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                            If a customer with the same <code>name</code> already exists they will be <strong>updated</strong>; otherwise a new customer is created.
                        </p>
                        <a
                            href={route('customers.import-template')}
                            download
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Download CSV template
                        </a>
                    </div>

                    {/* Drop zone */}
                    {!result && (
                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => inputRef.current?.click()}
                            className={`
                                relative flex flex-col items-center justify-center gap-2
                                rounded-lg border-2 border-dashed p-8 text-center
                                cursor-pointer transition-colors
                                ${dragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                                }
                            `}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={onInputChange}
                            />
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            {file ? (
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Drop your file here or click to browse</p>
                                    <p className="text-xs text-muted-foreground">Supports .csv, .xlsx, .xls — max {MAX_MB} MB</p>
                                </div>
                            )}
                            {file && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                    className="absolute top-2 right-2 rounded-full p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Result panel */}
                    {result && (
                        <div className="space-y-3">
                            {result.success ? (
                                <div className="rounded-lg border border-green-300 bg-green-50 p-4 flex items-start gap-3 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-200">
                                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div className="text-sm space-y-1">
                                        <p className="font-medium">Import complete</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge variant="success">{result.imported} created</Badge>
                                            {result.updated > 0 && <Badge variant="default">{result.updated} updated</Badge>}
                                            {result.skipped > 0 && <Badge variant="secondary">{result.skipped} skipped</Badge>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <p>{result.message ?? 'Import failed.'}</p>
                                </div>
                            )}

                            {result.errors.length > 0 && (
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Row warnings ({result.errors.length})
                                    </p>
                                    <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                                        <ul className="space-y-1">
                                            {result.errors.map((err, i) => (
                                                <li key={i} className="text-xs text-amber-700 dark:text-amber-400">{err}</li>
                                            ))}
                                        </ul>
                                    </ScrollArea>
                                </div>
                            )}

                            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="w-full">
                                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                Upload another file
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button type="button" onClick={handleUpload} disabled={!file || uploading}>
                            {uploading ? (
                                <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />Importing...</>
                            ) : (
                                <><Upload className="h-4 w-4 mr-1.5" />Import Customers</>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
