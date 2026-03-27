<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->decimal('hours_late', 8, 2)->default(0.00)->after('overtime_hours');
            $table->dropColumn('late_deduction');
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->decimal('late_deduction', 12, 2)->default(0.00)->after('overtime_hours');
            $table->dropColumn('hours_late');
        });
    }
};
