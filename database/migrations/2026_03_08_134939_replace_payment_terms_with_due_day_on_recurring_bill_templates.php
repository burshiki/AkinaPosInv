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
        Schema::table('recurring_bill_templates', function (Blueprint $table) {
            $table->unsignedTinyInteger('due_day_of_month')->default(1)->after('day_of_month');
            $table->dropColumn('payment_terms_days');
        });
    }

    public function down(): void
    {
        Schema::table('recurring_bill_templates', function (Blueprint $table) {
            $table->unsignedTinyInteger('payment_terms_days')->default(15)->after('day_of_month');
            $table->dropColumn('due_day_of_month');
        });
    }
};
