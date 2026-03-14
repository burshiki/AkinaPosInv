<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->decimal('days_present', 8, 2)->default(0)->change();
            $table->decimal('days_absent', 8, 2)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('attendance_records', function (Blueprint $table) {
            $table->integer('days_present')->change();
            $table->integer('days_absent')->default(0)->change();
        });
    }
};
