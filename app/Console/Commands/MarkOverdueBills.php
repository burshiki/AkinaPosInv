<?php

namespace App\Console\Commands;

use App\Services\AccountsPayableService;
use Illuminate\Console\Command;

class MarkOverdueBills extends Command
{
    protected $signature = 'bills:mark-overdue';

    protected $description = 'Mark unpaid bills past their due date as overdue.';

    public function handle(AccountsPayableService $service): int
    {
        $count = $service->markOverdueBills();

        $this->info("Marked {$count} bill(s) as overdue.");

        return self::SUCCESS;
    }
}
