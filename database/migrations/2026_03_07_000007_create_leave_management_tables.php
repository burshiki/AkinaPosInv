<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('leave_types')) {
            Schema::create('leave_types', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100); // Sick Leave, Vacation Leave, etc.
                $table->unsignedInteger('default_days_per_year')->default(0);
                $table->boolean('is_paid')->default(true);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('leave_requests')) {
            Schema::create('leave_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
                $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
                $table->date('start_date');
                $table->date('end_date');
                $table->decimal('days_count', 5, 1); // 0.5 for half-day
                $table->string('status', 20)->default('pending'); // pending, approved, rejected, cancelled
                $table->text('reason')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
            });
        }

        // Track per-year leave balances
        if (!Schema::hasTable('leave_balances')) {
            Schema::create('leave_balances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
                $table->foreignId('leave_type_id')->constrained()->cascadeOnDelete();
                $table->unsignedSmallInteger('year');
                $table->decimal('total_days', 5, 1)->default(0);
                $table->decimal('used_days', 5, 1)->default(0);
                $table->timestamps();

                $table->unique(['employee_id', 'leave_type_id', 'year']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_balances');
        Schema::dropIfExists('leave_requests');
        Schema::dropIfExists('leave_types');
    }
};
