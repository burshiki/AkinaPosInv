<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Reclassify manual stock adjustments that were warranty returns created
     * before the warranty_return type existed. Matches on reason containing
     * "warranty" or "defective" to cover common entries.
     */
    public function up(): void
    {
        DB::table('stock_adjustments')
            ->where('type', 'manual')
            ->where('adjustment_type', 'subtract')
            ->where(function ($q) {
                $q->where('reason', 'like', '%warranty%')
                  ->orWhere('reason', 'like', '%defective%');
            })
            ->update(['type' => 'warranty_return']);
    }

    public function down(): void
    {
        // Data correction — not reversible
    }
};
