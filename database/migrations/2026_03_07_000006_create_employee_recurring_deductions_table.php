<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_recurring_deductions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30); // cash_advance, loan, other
            $table->string('description');
            $table->decimal('total_amount', 12, 2); // original loan/advance amount
            $table->decimal('amount_per_period', 12, 2); // deduction per payroll period
            $table->decimal('amount_remaining', 12, 2); // remaining balance
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['employee_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_recurring_deductions');
    }
};
