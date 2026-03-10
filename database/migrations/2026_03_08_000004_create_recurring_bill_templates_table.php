<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_bill_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('supplier_name')->nullable();
            // rent, utilities, internet, supplies, other
            $table->string('category', 50);
            $table->decimal('amount', 12, 2);
            // monthly, quarterly, annually
            $table->string('frequency', 20);
            $table->unsignedTinyInteger('day_of_month')->default(1);
            $table->unsignedTinyInteger('payment_terms_days')->default(15);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->date('next_generate_date');
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index('next_generate_date');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_bill_templates');
    }
};
