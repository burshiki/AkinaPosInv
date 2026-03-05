<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@pos.local'],
            [
                'name'     => 'Administrator',
                'password' => bcrypt('password'),
                'is_admin' => true,
            ]
        );

        $admin->givePermissionTo(Permission::all());
    }
}
