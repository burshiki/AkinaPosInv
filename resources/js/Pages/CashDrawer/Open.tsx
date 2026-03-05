import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Textarea } from '@/Components/ui/textarea';
import { DollarSign, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { CashDrawerSession, PageProps } from '@/types';

interface Props {
    openSession: CashDrawerSession | null;
}

export default function CashDrawerOpen({ openSession }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [openingBalance, setOpeningBalance] = useState('0');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            route('cash-drawer.store'),
            {
                opening_balance: openingBalance,
                opening_notes: notes || null,
            },
            {
                onSuccess: () => setProcessing(false),
                onError: () => setProcessing(false),
            }
        );
    };

    if (openSession) {
        const isOwner = openSession.user_id === auth.user?.id;

        return (
            <AuthenticatedLayout header="Open Cash Drawer">
                <Head title="Open Cash Drawer" />

                <div className="mx-auto max-w-md">
                    <Card className="border-yellow-300">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <CardTitle>Session Already Open</CardTitle>
                            <CardDescription>
                                {isOwner
                                    ? 'You already have an active cash drawer session.'
                                    : <>A cash drawer session is currently open by <span className="font-semibold text-foreground">{openSession.user?.name ?? 'another user'}</span>. Only one session is allowed at a time.</>
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground space-y-1">
                                <p><span className="font-medium text-foreground">Opened by:</span>{' '}
                                    {openSession.user?.name ?? '—'}
                                </p>
                                <p><span className="font-medium text-foreground">Opened at:</span>{' '}
                                    {new Date(openSession.opened_at).toLocaleString()}
                                </p>
                                <p><span className="font-medium text-foreground">Opening balance:</span>{' '}
                                    {Number(openSession.opening_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <Button asChild className="w-full" size="lg">
                                <Link href={route('sales.create')}>Go to Sales</Link>
                            </Button>
                            {isOwner && (
                                <Button asChild variant="outline" className="w-full" size="lg">
                                    <Link href={route('cash-drawer.close')}>Close Session</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header="Open Cash Drawer">
            <Head title="Open Cash Drawer" />

            <div className="mx-auto max-w-md">
                <Card>
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>Open Cash Drawer</CardTitle>
                        <CardDescription>
                            Enter the opening balance to start your cash drawer session.
                            You must open a drawer before processing sales.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="opening_balance">Opening Balance *</Label>
                                <Input
                                    id="opening_balance"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Count the cash currently in the drawer and enter the amount.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any notes about the opening..."
                                    rows={3}
                                />
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={processing}>
                                {processing ? 'Opening...' : 'Open Cash Drawer'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
