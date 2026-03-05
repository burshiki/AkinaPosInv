<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('customer_id')
                ->nullable()
                ->after('user_id')
                ->constrained('customers')
                ->nullOnDelete();

            $table->foreignId('cash_drawer_session_id')
                ->nullable()
                ->after('bank_account_id')
                ->constrained('cash_drawer_sessions')
                ->nullOnDelete();

            $table->index('customer_id');
            $table->index('cash_drawer_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
            $table->dropForeign(['cash_drawer_session_id']);
            $table->dropColumn('cash_drawer_session_id');
        });
    }
};
