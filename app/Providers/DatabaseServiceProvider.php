<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\DB;

class DatabaseServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if (config('database.default') === 'sqlite') {
            DB::statement('PRAGMA mmap_size=268435456;');
            DB::statement('PRAGMA cache_size=-64000;');
            DB::statement('PRAGMA temp_store=MEMORY;');
        }
    }
}
