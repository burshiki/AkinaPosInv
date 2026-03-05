import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { PermissionGate } from '@/Components/app/permission-gate';
import { ArrowLeft, Pencil, Phone, Mail, MapPin, FileText, CreditCard } from 'lucide-react';
import type { Customer } from '@/types';

interface Props {
    customer: Customer;
}

export default function CustomerShow({ customer }: Props) {
    return (
        <AuthenticatedLayout header="Customer Details">
            <Head title={`Customer — ${customer.name}`} />

            <div className="mx-auto max-w-xl space-y-4">
                <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={route('customers.index')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <PermissionGate permission="debts.view">
                            <Button variant="outline" asChild>
                                <Link href={route('debts.show', customer.name)}>
                                    <CreditCard className="mr-2 h-4 w-4" /> View Debts
                                </Link>
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission="customers.edit">
                            <Button asChild>
                                <Link href={route('customers.edit', customer.id)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">{customer.name}</CardTitle>
                            <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                                {customer.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.phone}</span>
                            </div>
                        )}
                        {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.email}</span>
                            </div>
                        )}
                        {customer.address && (
                            <>
                                <Separator />
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-line">{customer.address}</span>
                                </div>
                            </>
                        )}
                        {customer.notes && (
                            <>
                                <Separator />
                                <div className="flex items-start gap-2 text-sm">
                                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-line text-muted-foreground">{customer.notes}</span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
