<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            // RA 7394 — Consumer Act of the Philippines: Three R's (Repair/Replacement/Refund)
            $table->string('resolution_type')->nullable()->after('tracking_number');
        });
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->dropColumn('resolution_type');
        });
    }
};
