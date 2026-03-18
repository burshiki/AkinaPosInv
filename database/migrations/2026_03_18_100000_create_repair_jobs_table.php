<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('repair_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('job_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone', 50)->nullable();
            $table->text('problem_description');
            // pending | in_progress | done | claimed
            $table->string('status', 30)->default('pending');
            $table->foreignId('technician_id')->constrained('users')->restrictOnDelete();
            $table->decimal('repair_fee', 10, 2)->nullable();
            $table->timestamp('accepted_at');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('technician_id');
            $table->index('accepted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('repair_jobs');
    }
};
