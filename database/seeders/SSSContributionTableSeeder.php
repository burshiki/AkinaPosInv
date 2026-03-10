<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SSSContributionTableSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('sss_contribution_table')->truncate();

        // 2024 SSS Contribution Schedule (14% total: 4.5% employee, 8.5% employer + EC)
        $brackets = [
            ['range_from' => 0,        'range_to' => 4249.99,  'msc' => 4000,  'employee_share' => 180.00,   'employer_share' => 340.00,   'ec_share' => 10.00],
            ['range_from' => 4250,      'range_to' => 4749.99,  'msc' => 4500,  'employee_share' => 202.50,   'employer_share' => 382.50,   'ec_share' => 10.00],
            ['range_from' => 4750,      'range_to' => 5249.99,  'msc' => 5000,  'employee_share' => 225.00,   'employer_share' => 425.00,   'ec_share' => 10.00],
            ['range_from' => 5250,      'range_to' => 5749.99,  'msc' => 5500,  'employee_share' => 247.50,   'employer_share' => 467.50,   'ec_share' => 10.00],
            ['range_from' => 5750,      'range_to' => 6249.99,  'msc' => 6000,  'employee_share' => 270.00,   'employer_share' => 510.00,   'ec_share' => 10.00],
            ['range_from' => 6250,      'range_to' => 6749.99,  'msc' => 6500,  'employee_share' => 292.50,   'employer_share' => 552.50,   'ec_share' => 10.00],
            ['range_from' => 6750,      'range_to' => 7249.99,  'msc' => 7000,  'employee_share' => 315.00,   'employer_share' => 595.00,   'ec_share' => 10.00],
            ['range_from' => 7250,      'range_to' => 7749.99,  'msc' => 7500,  'employee_share' => 337.50,   'employer_share' => 637.50,   'ec_share' => 10.00],
            ['range_from' => 7750,      'range_to' => 8249.99,  'msc' => 8000,  'employee_share' => 360.00,   'employer_share' => 680.00,   'ec_share' => 10.00],
            ['range_from' => 8250,      'range_to' => 8749.99,  'msc' => 8500,  'employee_share' => 382.50,   'employer_share' => 722.50,   'ec_share' => 10.00],
            ['range_from' => 8750,      'range_to' => 9249.99,  'msc' => 9000,  'employee_share' => 405.00,   'employer_share' => 765.00,   'ec_share' => 10.00],
            ['range_from' => 9250,      'range_to' => 9749.99,  'msc' => 9500,  'employee_share' => 427.50,   'employer_share' => 807.50,   'ec_share' => 10.00],
            ['range_from' => 9750,      'range_to' => 10249.99, 'msc' => 10000, 'employee_share' => 450.00,   'employer_share' => 850.00,   'ec_share' => 10.00],
            ['range_from' => 10250,     'range_to' => 10749.99, 'msc' => 10500, 'employee_share' => 472.50,   'employer_share' => 892.50,   'ec_share' => 10.00],
            ['range_from' => 10750,     'range_to' => 11249.99, 'msc' => 11000, 'employee_share' => 495.00,   'employer_share' => 935.00,   'ec_share' => 10.00],
            ['range_from' => 11250,     'range_to' => 11749.99, 'msc' => 11500, 'employee_share' => 517.50,   'employer_share' => 977.50,   'ec_share' => 10.00],
            ['range_from' => 11750,     'range_to' => 12249.99, 'msc' => 12000, 'employee_share' => 540.00,   'employer_share' => 1020.00,  'ec_share' => 10.00],
            ['range_from' => 12250,     'range_to' => 12749.99, 'msc' => 12500, 'employee_share' => 562.50,   'employer_share' => 1062.50,  'ec_share' => 10.00],
            ['range_from' => 12750,     'range_to' => 13249.99, 'msc' => 13000, 'employee_share' => 585.00,   'employer_share' => 1105.00,  'ec_share' => 10.00],
            ['range_from' => 13250,     'range_to' => 13749.99, 'msc' => 13500, 'employee_share' => 607.50,   'employer_share' => 1147.50,  'ec_share' => 10.00],
            ['range_from' => 13750,     'range_to' => 14249.99, 'msc' => 14000, 'employee_share' => 630.00,   'employer_share' => 1190.00,  'ec_share' => 10.00],
            ['range_from' => 14250,     'range_to' => 14749.99, 'msc' => 14500, 'employee_share' => 652.50,   'employer_share' => 1232.50,  'ec_share' => 30.00],
            ['range_from' => 14750,     'range_to' => 15249.99, 'msc' => 15000, 'employee_share' => 675.00,   'employer_share' => 1275.00,  'ec_share' => 30.00],
            ['range_from' => 15250,     'range_to' => 15749.99, 'msc' => 15500, 'employee_share' => 697.50,   'employer_share' => 1317.50,  'ec_share' => 30.00],
            ['range_from' => 15750,     'range_to' => 16249.99, 'msc' => 16000, 'employee_share' => 720.00,   'employer_share' => 1360.00,  'ec_share' => 30.00],
            ['range_from' => 16250,     'range_to' => 16749.99, 'msc' => 16500, 'employee_share' => 742.50,   'employer_share' => 1402.50,  'ec_share' => 30.00],
            ['range_from' => 16750,     'range_to' => 17249.99, 'msc' => 17000, 'employee_share' => 765.00,   'employer_share' => 1445.00,  'ec_share' => 30.00],
            ['range_from' => 17250,     'range_to' => 17749.99, 'msc' => 17500, 'employee_share' => 787.50,   'employer_share' => 1487.50,  'ec_share' => 30.00],
            ['range_from' => 17750,     'range_to' => 18249.99, 'msc' => 18000, 'employee_share' => 810.00,   'employer_share' => 1530.00,  'ec_share' => 30.00],
            ['range_from' => 18250,     'range_to' => 18749.99, 'msc' => 18500, 'employee_share' => 832.50,   'employer_share' => 1572.50,  'ec_share' => 30.00],
            ['range_from' => 18750,     'range_to' => 19249.99, 'msc' => 19000, 'employee_share' => 855.00,   'employer_share' => 1615.00,  'ec_share' => 30.00],
            ['range_from' => 19250,     'range_to' => 19749.99, 'msc' => 19500, 'employee_share' => 877.50,   'employer_share' => 1657.50,  'ec_share' => 30.00],
            ['range_from' => 19750,     'range_to' => 20249.99, 'msc' => 20000, 'employee_share' => 900.00,   'employer_share' => 1700.00,  'ec_share' => 30.00],
            ['range_from' => 20250,     'range_to' => 20749.99, 'msc' => 20500, 'employee_share' => 922.50,   'employer_share' => 1742.50,  'ec_share' => 30.00],
            ['range_from' => 20750,     'range_to' => 21249.99, 'msc' => 21000, 'employee_share' => 945.00,   'employer_share' => 1785.00,  'ec_share' => 30.00],
            ['range_from' => 21250,     'range_to' => 21749.99, 'msc' => 21500, 'employee_share' => 967.50,   'employer_share' => 1827.50,  'ec_share' => 30.00],
            ['range_from' => 21750,     'range_to' => 22249.99, 'msc' => 22000, 'employee_share' => 990.00,   'employer_share' => 1870.00,  'ec_share' => 30.00],
            ['range_from' => 22250,     'range_to' => 22749.99, 'msc' => 22500, 'employee_share' => 1012.50,  'employer_share' => 1912.50,  'ec_share' => 30.00],
            ['range_from' => 22750,     'range_to' => 23249.99, 'msc' => 23000, 'employee_share' => 1035.00,  'employer_share' => 1955.00,  'ec_share' => 30.00],
            ['range_from' => 23250,     'range_to' => 23749.99, 'msc' => 23500, 'employee_share' => 1057.50,  'employer_share' => 1997.50,  'ec_share' => 30.00],
            ['range_from' => 23750,     'range_to' => 24249.99, 'msc' => 24000, 'employee_share' => 1080.00,  'employer_share' => 2040.00,  'ec_share' => 30.00],
            ['range_from' => 24250,     'range_to' => 24749.99, 'msc' => 24500, 'employee_share' => 1102.50,  'employer_share' => 2082.50,  'ec_share' => 30.00],
            ['range_from' => 24750,     'range_to' => 25249.99, 'msc' => 25000, 'employee_share' => 1125.00,  'employer_share' => 2125.00,  'ec_share' => 30.00],
            ['range_from' => 25250,     'range_to' => 25749.99, 'msc' => 25500, 'employee_share' => 1147.50,  'employer_share' => 2167.50,  'ec_share' => 30.00],
            ['range_from' => 25750,     'range_to' => 26249.99, 'msc' => 26000, 'employee_share' => 1170.00,  'employer_share' => 2210.00,  'ec_share' => 30.00],
            ['range_from' => 26250,     'range_to' => 26749.99, 'msc' => 26500, 'employee_share' => 1192.50,  'employer_share' => 2252.50,  'ec_share' => 30.00],
            ['range_from' => 26750,     'range_to' => 27249.99, 'msc' => 27000, 'employee_share' => 1215.00,  'employer_share' => 2295.00,  'ec_share' => 30.00],
            ['range_from' => 27250,     'range_to' => 27749.99, 'msc' => 27500, 'employee_share' => 1237.50,  'employer_share' => 2337.50,  'ec_share' => 30.00],
            ['range_from' => 27750,     'range_to' => 28249.99, 'msc' => 28000, 'employee_share' => 1260.00,  'employer_share' => 2380.00,  'ec_share' => 30.00],
            ['range_from' => 28250,     'range_to' => 28749.99, 'msc' => 28500, 'employee_share' => 1282.50,  'employer_share' => 2422.50,  'ec_share' => 30.00],
            ['range_from' => 28750,     'range_to' => 29249.99, 'msc' => 29000, 'employee_share' => 1305.00,  'employer_share' => 2465.00,  'ec_share' => 30.00],
            ['range_from' => 29250,     'range_to' => 29749.99, 'msc' => 29500, 'employee_share' => 1327.50,  'employer_share' => 2507.50,  'ec_share' => 30.00],
            ['range_from' => 29750,     'range_to' => 999999999.99, 'msc' => 30000, 'employee_share' => 1350.00, 'employer_share' => 2550.00, 'ec_share' => 30.00],
        ];

        $now = now();
        foreach ($brackets as $bracket) {
            $bracket['total_contribution'] = $bracket['employee_share'] + $bracket['employer_share'] + $bracket['ec_share'];
            $bracket['is_active'] = true;
            $bracket['created_at'] = $now;
            $bracket['updated_at'] = $now;
            DB::table('sss_contribution_table')->insert($bracket);
        }
    }
}
