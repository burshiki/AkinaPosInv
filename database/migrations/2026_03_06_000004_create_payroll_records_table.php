<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_period_id')->constrained('payroll_periods')->restrictOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();

            // Earnings
            $table->decimal('basic_pay', 12, 2);
            $table->decimal('overtime_pay', 12, 2)->default(0.00);
            $table->decimal('holiday_pay', 12, 2)->default(0.00);
            $table->decimal('allowances', 12, 2)->default(0.00);
            $table->decimal('gross_pay', 12, 2);

            // Government deductions (employee share)
            $table->decimal('sss_employee', 12, 2)->default(0.00);
            $table->decimal('philhealth_employee', 12, 2)->default(0.00);
            $table->decimal('pagibig_employee', 12, 2)->default(0.00);
            $table->decimal('bir_withholding_tax', 12, 2)->default(0.00);

            // Employer share (for reporting)
            $table->decimal('sss_employer', 12, 2)->default(0.00);
            $table->decimal('sss_ec', 12, 2)->default(0.00);
            $table->decimal('philhealth_employer', 12, 2)->default(0.00);
            $table->decimal('pagibig_employer', 12, 2)->default(0.00);

            // Other deductions
            $table->decimal('late_deduction', 12, 2)->default(0.00);
            $table->decimal('other_deductions', 12, 2)->default(0.00);
            $table->text('other_deductions_notes')->nullable();

            // Totals
            $table->decimal('total_deductions', 12, 2);
            $table->decimal('net_pay', 12, 2);

            // Snapshot of employee details at computation time
            $table->string('pay_type', 10);
            $table->decimal('basic_salary_snapshot', 12, 2);
            $table->integer('days_present');
            $table->integer('days_absent');
            $table->decimal('overtime_hours', 8, 2)->default(0.00);

            $table->string('status', 10)->default('draft'); // draft, confirmed, paid
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('computed_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['payroll_period_id', 'employee_id']);
            $table->index('payroll_period_id');
            $table->index('employee_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_records');
    }
};
