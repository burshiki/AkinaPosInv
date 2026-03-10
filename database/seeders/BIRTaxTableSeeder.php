<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BIRTaxTableSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('bir_tax_table')->truncate();

        // TRAIN Law (RA 10963) Monthly Withholding Tax Table
        // Effective 2023 onwards — personal/additional exemptions removed under TRAIN
        // Using tax_status 'all' since TRAIN eliminated status-based exemptions
        $brackets = [
            ['tax_status' => 'all', 'range_from' => 0,          'range_to' => 20833,    'base_tax' => 0,          'excess_over' => 0,         'tax_rate' => 0.0000],
            ['tax_status' => 'all', 'range_from' => 20833.01,   'range_to' => 33332,    'base_tax' => 0,          'excess_over' => 20833,     'tax_rate' => 0.1500],
            ['tax_status' => 'all', 'range_from' => 33333,      'range_to' => 66666,    'base_tax' => 1875.00,    'excess_over' => 33333,     'tax_rate' => 0.2000],
            ['tax_status' => 'all', 'range_from' => 66667,      'range_to' => 166666,   'base_tax' => 8541.80,    'excess_over' => 66667,     'tax_rate' => 0.2500],
            ['tax_status' => 'all', 'range_from' => 166667,     'range_to' => 666666,   'base_tax' => 33541.80,   'excess_over' => 166667,    'tax_rate' => 0.3000],
            ['tax_status' => 'all', 'range_from' => 666667,     'range_to' => null,     'base_tax' => 183541.80,  'excess_over' => 666667,    'tax_rate' => 0.3500],
        ];

        $now = now();
        foreach ($brackets as $bracket) {
            $bracket['is_active'] = true;
            $bracket['created_at'] = $now;
            $bracket['updated_at'] = $now;
            DB::table('bir_tax_table')->insert($bracket);
        }
    }
}
