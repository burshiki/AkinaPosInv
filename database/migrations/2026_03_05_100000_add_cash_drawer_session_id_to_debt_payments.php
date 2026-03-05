<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->foreignId('cash_drawer_session_id')
                ->nullable()
                ->after('bank_account_id')
                ->constrained('cash_drawer_sessions')
                ->nullOnDelete();

            $table->index('cash_drawer_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropForeign(['cash_drawer_session_id']);
            $table->dropIndex(['cash_drawer_session_id']);
            $table->dropColumn('cash_drawer_session_id');
        });
    }
};
