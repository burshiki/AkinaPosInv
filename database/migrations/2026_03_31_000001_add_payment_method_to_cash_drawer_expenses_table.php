<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_drawer_expenses', function (Blueprint $table) {
            // null = cash expense (reduces drawer), non-null = bank/online (informational only)
            $table->string('payment_method', 50)->nullable()->after('category');
        });
    }

    public function down(): void
    {
        Schema::table('cash_drawer_expenses', function (Blueprint $table) {
            $table->dropColumn('payment_method');
        });
    }
};
