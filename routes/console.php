<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Automated MySQL backup — runs daily at 2:00 AM
Schedule::command('backup:mysql')->dailyAt('02:00');

// Generate recurring bills — runs daily at 6:00 AM
Schedule::command('bills:generate-recurring')->dailyAt('06:00');

// Mark overdue bills — runs daily at 6:15 AM
Schedule::command('bills:mark-overdue')->dailyAt('06:15');
