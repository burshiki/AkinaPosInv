<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('employee_number', 30)->unique();
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('position', 100)->nullable();
            $table->string('department', 100)->nullable();
            $table->string('pay_type', 10); // 'monthly' or 'daily'
            $table->decimal('basic_salary', 12, 2);
            $table->integer('standard_work_days')->default(26);
            $table->integer('monthly_divisor')->default(313);
            $table->date('hired_at');
            $table->date('separated_at')->nullable();
            $table->string('sss_number', 30)->nullable();
            $table->string('philhealth_number', 30)->nullable();
            $table->string('pagibig_number', 30)->nullable();
            $table->string('tin', 30)->nullable();
            $table->string('tax_status', 10)->default('S');
            $table->string('phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
            $table->index('pay_type');
            $table->index('last_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
