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
        Schema::table('bill_payments', function (Blueprint $table) {
            $table->date('check_date')->nullable()->after('check_number');
        });
    }

    public function down(): void
    {
        Schema::table('bill_payments', function (Blueprint $table) {
            $table->dropColumn('check_date');
        });
    }
};
