<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->cascadeOnDelete();
            $table->integer('days_present');
            $table->integer('days_absent')->default(0);
            $table->integer('days_late')->default(0);
            $table->decimal('overtime_hours', 8, 2)->default(0.00);
            $table->decimal('late_deduction', 12, 2)->default(0.00);
            // Holiday fields
            $table->integer('regular_holidays_not_worked')->default(0);
            $table->integer('regular_holidays_worked')->default(0);
            $table->integer('special_holidays_worked')->default(0);
            $table->integer('regular_holidays_restday_worked')->default(0);
            $table->integer('special_holidays_restday_worked')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'payroll_period_id']);
            $table->index('payroll_period_id');
            $table->index('employee_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
