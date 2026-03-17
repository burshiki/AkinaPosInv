<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warranty_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warranty_id')->constrained()->cascadeOnDelete();
            $table->string('claim_number')->unique();
            $table->text('issue_description')->nullable();
            // open → confirmed → in_repair → resolved
            //                  ↘ no_defect
            $table->string('status')->default('open');
            $table->string('resolution_type')->nullable(); // repair | replacement | refund
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('tracking_number')->nullable();
            $table->string('received_serial_number')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['warranty_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranty_claims');
    }
};
