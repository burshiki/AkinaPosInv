<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('leave_types') && !Schema::hasColumn('leave_types', 'min_service_months')) {
            Schema::table('leave_types', function (Blueprint $table) {
                // Minimum months of service required to avail this leave (e.g., SIL = 12 months)
                $table->unsignedTinyInteger('min_service_months')->nullable()->after('is_active');
                // Whether unused days must be converted to cash at year-end (SIL rule)
                $table->boolean('is_cash_convertible')->default(false)->after('min_service_months');
            });
        }

        if (Schema::hasTable('leave_balances') && !Schema::hasColumn('leave_balances', 'cash_converted_days')) {
            Schema::table('leave_balances', function (Blueprint $table) {
                // Tracks how many days were converted to cash instead of used (year-end SIL conversion)
                $table->decimal('cash_converted_days', 5, 1)->default(0)->after('used_days');
            });
        }
    }

    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            $table->dropColumn('cash_converted_days');
        });

        Schema::table('leave_types', function (Blueprint $table) {
            $table->dropColumn(['min_service_months', 'is_cash_convertible']);
        });
    }
};
