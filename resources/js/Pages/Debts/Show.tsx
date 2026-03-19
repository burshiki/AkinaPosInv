import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Separator } from '@/Components/ui/separator';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, DollarSign } from 'lucide-react';
import type { CustomerDebt } from '@/types';

interface Props {
    customerName: string;
    customerId: number | null;
    debts: CustomerDebt[];
    totalAmount: number;
    totalPaid: number;
    totalBalance: number;
}

export default function DebtsShow({ customerName, customerId, debts, totalAmount, totalPaid, totalBalance }: Props) {
    const statusVariant = (status: string) => {
        switch (status) {
            case 'paid': return 'success' as const;
            case 'partial': return 'warning' as const;
            default: return 'destructive' as const;
        }
    };

    return (
        <AuthenticatedLayout header={`Debts: ${customerName}`}>
            <Head title={`Debts - ${customerName}`} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('debts.index')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Debts
                            </Link>
                        </Button>
                        {customerId && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('customers.show', customerId)}>
                                    View Customer
                                </Link>
                            </Button>
                        )}
                    </div>
                    <PermissionGate permission="debts.receive_payment">
                        <Button asChild>
                            <Link href={route('debt-payments.create', { customer_name: customerName })}>
                                <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                {/* Summary Card */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Debt</p>
                            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Outstanding</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Debts List */}
                {debts.map((debt) => (
                    <Card key={debt.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">
                                    {debt.sale ? `Sale: ${debt.sale.receipt_number}` : `Debt #${debt.id}`}
                                </CardTitle>
                                <Badge variant={statusVariant(debt.status)}>{debt.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Amount</p>
                                    <p className="font-medium">{formatCurrency(debt.total_amount)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Paid</p>
                                    <p className="font-medium text-green-600">{formatCurrency(debt.paid_amount)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Balance</p>
                                    <p className="font-medium text-red-600">{formatCurrency(debt.balance)}</p>
                                </div>
                            </div>

                            {debt.payments && debt.payments.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="mb-2 text-sm font-medium">Payment History</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Method</TableHead>
                                                    <TableHead>Account</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {debt.payments.map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{formatDate(payment.paid_at)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{payment.payment_method}</Badge>
                                                        </TableCell>
                                                        <TableCell>{payment.bank_account?.name ?? '—'}</TableCell>
                                                        <TableCell className="text-right font-medium text-green-600">
                                                            {formatCurrency(payment.amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
