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
            $table->decimal('loan_deduction', 12, 2)->default(0.00)->after('cash_advance');
        });
    }

    public function down(): void
    {
        Schema::table('payroll_records', function (Blueprint $table) {
            $table->dropColumn('loan_deduction');
        });
    }
};
