<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use Illuminate\Database\Seeder;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'name'           => 'Cash Drawer',
                'type'           => 'cash_drawer',
                'account_number' => null,
                'description'    => 'Physical cash drawer at the counter',
                'balance'        => 0.00,
            ],
            [
                'name'           => 'GCash',
                'type'           => 'gcash',
                'account_number' => '09XXXXXXXXX',
                'description'    => 'GCash e-wallet',
                'balance'        => 0.00,
            ],
            [
                'name'           => 'Maya',
                'type'           => 'maya',
                'account_number' => '09XXXXXXXXX',
                'description'    => 'Maya e-wallet',
                'balance'        => 0.00,
            ],
            [
                'name'           => 'BDO Savings',
                'type'           => 'bdo',
                'account_number' => 'XXXX-XXXX-XXXX',
                'description'    => 'BDO savings account',
                'balance'        => 0.00,
            ],
        ];

        foreach ($accounts as $account) {
            BankAccount::firstOrCreate(
                ['type' => $account['type']],
                $account
            );
        }
    }
}
