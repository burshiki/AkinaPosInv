<?php

namespace Database\Seeders;

use App\Models\LeaveType;
use Illuminate\Database\Seeder;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            // Standard leave types - no minimum service requirement
            ['name' => 'Vacation Leave',    'default_days_per_year' => 5,   'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Sick Leave',        'default_days_per_year' => 5,   'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Emergency Leave',   'default_days_per_year' => 3,   'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Maternity Leave',   'default_days_per_year' => 105, 'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Paternity Leave',   'default_days_per_year' => 7,   'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Solo Parent Leave', 'default_days_per_year' => 7,   'is_paid' => true,  'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],
            ['name' => 'Unpaid Leave',      'default_days_per_year' => 0,   'is_paid' => false, 'is_active' => true, 'min_service_months' => null, 'is_cash_convertible' => false],

            // Mandatory Service Incentive Leave (SIL) — Labor Code of the Philippines Art. 95
            // - 5 days with full pay per year
            // - Requires 12 months of service (continuous or broken)
            // - Unused SIL at year-end must be converted to its cash equivalent
            // - Employees already enjoying ≥5 days paid vacation leave are NOT entitled to SIL
            [
                'name'                  => 'Service Incentive Leave',
                'default_days_per_year' => 5,
                'is_paid'               => true,
                'is_active'             => true,
                'min_service_months'    => 12,
                'is_cash_convertible'   => true,
            ],
        ];

        foreach ($types as $type) {
            LeaveType::updateOrCreate(['name' => $type['name']], $type);
        }
    }
}
