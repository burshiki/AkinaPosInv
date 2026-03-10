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
            $table->string('disbursement_source')->nullable()->after('paid_at');
            $table->unsignedBigInteger('disbursement_id')->nullable()->after('disbursement_source');
            $table->string('disbursement_notes')->nullable()->after('disbursement_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payroll_records', function (Blueprint $table) {
            $table->dropColumn(['disbursement_source', 'disbursement_id', 'disbursement_notes']);
        });
    }
};
