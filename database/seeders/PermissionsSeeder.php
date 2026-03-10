<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'dashboard.view',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'inventory.build', 'inventory.adjust_stock',
            'sales.view', 'sales.create', 'sales.void', 'sales.refund',
            'banking.view', 'banking.manage', 'banking.transfer', 'banking.reconcile',
            'debts.view', 'debts.create', 'debts.receive_payment',
            'reports.view', 'reports.export',
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'users.manage_permissions',
            // Customers module
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            // Suppliers module
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
            // Purchasing module
            'purchasing.view', 'purchasing.create', 'purchasing.manage', 'purchasing.receive', 'purchasing.delete', 'purchasing.approve',
            // Warranties module
            'warranties.view', 'warranties.record_serial',
            'warranties.check', 'warranties.send_to_supplier',
            // Stock module
            'stock.view', 'stock.adjust', 'stock.manage_inventory',
            // Payroll module
            'payroll.view', 'payroll.manage_employees', 'payroll.attendance',
            'payroll.process', 'payroll.approve', 'payroll.reports',
            // Promotions module
            'promotions.view', 'promotions.manage',
            // Leave management
            'leave.view', 'leave.request', 'leave.approve',
            // Accounts Payable module
            'ap.view', 'ap.create', 'ap.pay', 'ap.void', 'ap.manage_recurring',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }
    }
}
