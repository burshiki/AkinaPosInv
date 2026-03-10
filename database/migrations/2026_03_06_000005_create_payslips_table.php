<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_record_id')->constrained('payroll_records')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->restrictOnDelete();
            $table->string('payslip_number', 50)->unique();
            $table->timestamp('generated_at');
            $table->foreignId('generated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index('employee_id');
            $table->index('payroll_period_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslips');
    }
};
