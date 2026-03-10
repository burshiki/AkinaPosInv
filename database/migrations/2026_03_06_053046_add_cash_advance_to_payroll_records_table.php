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
        Schema::table('payroll_records', function (Blueprint $table) {
            $table->decimal('cash_advance', 12, 2)->default(0.00)->after('other_deductions_notes');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_records', function (Blueprint $table) {
            $table->dropColumn('cash_advance');
        });
    }
};
