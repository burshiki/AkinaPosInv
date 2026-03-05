import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { PermissionGate } from '@/Components/app/permission-gate';
import { BarChart3, Package, DollarSign, Clock, PackageMinus, FileText } from 'lucide-react';

export default function ReportsIndex() {
    const reports = [
        {
            title: 'Sales Report',
            description: 'Revenue, transactions, and sales trends by date range.',
            icon: BarChart3,
            href: route('reports.show', 'sales'),
            permission: 'reports.view',
        },
        {
            title: 'Inventory Report',
            description: 'Current stock levels, low stock alerts, and inventory valuation.',
            icon: Package,
            href: route('reports.show', 'inventory'),
            permission: 'reports.view',
        },
        {
            title: 'Financial Report',
            description: 'Profit & loss, bank account summaries, and cash flow.',
            icon: DollarSign,
            href: route('reports.show', 'financial'),
            permission: 'reports.view',
        },
        {
            title: 'Debt Aging Report',
            description: 'Customer outstanding debts grouped by aging buckets.',
            icon: Clock,
            href: route('reports.show', 'debt-aging'),
            permission: 'reports.view',
        },
        {
            title: 'Internal Use Report',
            description: 'Items consumed internally — quantities and total cost value by date range.',
            icon: PackageMinus,
            href: route('reports.show', 'internal-use'),
            permission: 'reports.view',
        },
        {
            title: 'Z-Report (End of Day)',
            description: 'Daily summary: sales by method, voids, returns, tax collected, cash drawer variance.',
            icon: FileText,
            href: route('reports.show', 'z-report'),
            permission: 'reports.view',
        },
    ];

    return (
        <AuthenticatedLayout header="Reports">
            <Head title="Reports" />

            <div className="grid gap-4 sm:grid-cols-2">
                {reports.map((report) => (
                    <PermissionGate key={report.title} permission={report.permission}>
                        <Link href={report.href} className="block">
                            <Card className="transition-colors hover:bg-muted/50">
                                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                    <div className="rounded-lg bg-primary/10 p-2">
                                        <report.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{report.title}</CardTitle>
                                        <CardDescription>{report.description}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    </PermissionGate>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
