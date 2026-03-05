import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Pagination } from '@/Components/ui/pagination';
import { PermissionGate } from '@/Components/app/permission-gate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Pencil } from 'lucide-react';
import type { BankAccount, BankAccountLedgerEntry, PaginatedData } from '@/types';

interface Props {
    bankAccount: BankAccount;
    ledgerEntries: PaginatedData<BankAccountLedgerEntry>;
}

export default function BankAccountsShow({ bankAccount, ledgerEntries }: Props) {
    return (
        <AuthenticatedLayout header={`Account: ${bankAccount.name}`}>
            <Head title={bankAccount.name} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('bank-accounts.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <PermissionGate permission="banking.manage">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('bank-accounts.edit', bankAccount.id)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Account
                            </Link>
                        </Button>
                    </PermissionGate>
                </div>

                <Card>
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <h2 className="text-xl font-bold">{bankAccount.name}</h2>
                            {bankAccount.account_number && (
                                <p className="text-sm text-muted-foreground">{bankAccount.account_number}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-3xl font-bold">{formatCurrency(bankAccount.balance)}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledgerEntries.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No ledger entries yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ledgerEntries.data.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="text-sm">{formatDate(entry.transacted_at)}</TableCell>
                                        <TableCell>
                                            {entry.type === 'in' ? (
                                                <Badge variant="success" className="gap-1">
                                                    <ArrowDownCircle className="h-3 w-3" /> IN
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="gap-1">
                                                    <ArrowUpCircle className="h-3 w-3" /> OUT
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{entry.category}</Badge>
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${entry.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                            {entry.type === 'in' ? '+' : '-'}{formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(entry.running_balance)}</TableCell>
                                        <TableCell className="text-sm">{entry.performer?.name ?? '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination data={ledgerEntries} />
            </div>
        </AuthenticatedLayout>
    );
}
