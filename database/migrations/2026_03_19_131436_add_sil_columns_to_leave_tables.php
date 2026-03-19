<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leave_types', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_types', 'min_service_months')) {
                $table->unsignedTinyInteger('min_service_months')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('leave_types', 'is_cash_convertible')) {
                $table->boolean('is_cash_convertible')->default(false)->after('min_service_months');
            }
        });

        Schema::table('leave_balances', function (Blueprint $table) {
            if (!Schema::hasColumn('leave_balances', 'cash_converted_days')) {
                $table->decimal('cash_converted_days', 5, 1)->default(0)->after('used_days');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_balances', function (Blueprint $table) {
            if (Schema::hasColumn('leave_balances', 'cash_converted_days')) {
                $table->dropColumn('cash_converted_days');
            }
        });

        Schema::table('leave_types', function (Blueprint $table) {
            $columns = array_filter(['min_service_months', 'is_cash_convertible'], fn ($c) => Schema::hasColumn('leave_types', $c));
            if ($columns) {
                $table->dropColumn(array_values($columns));
            }
        });
    }
};
