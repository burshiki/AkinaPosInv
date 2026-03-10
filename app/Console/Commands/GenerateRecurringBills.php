<?php

namespace App\Console\Commands;

use App\Services\RecurringBillService;
use Illuminate\Console\Command;

class GenerateRecurringBills extends Command
{
    protected $signature = 'bills:generate-recurring';

    protected $description = 'Generate bills from active recurring bill templates that are due.';

    public function handle(RecurringBillService $service): int
    {
        $bills = $service->generateDueBills();

        $this->info("Generated {$bills} recurring bill(s).");

        return self::SUCCESS;
    }
}
