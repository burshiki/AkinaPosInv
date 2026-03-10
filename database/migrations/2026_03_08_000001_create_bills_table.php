<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('bill_number', 50)->unique();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('supplier_name');
            $table->foreignId('purchase_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('recurring_bill_template_id')->nullable();
            // purchase_order, rent, utilities, internet, supplies, other
            $table->string('category', 50);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            // unpaid, partially_paid, paid, overdue, voided
            $table->string('status', 30)->default('unpaid');
            $table->date('bill_date');
            $table->date('due_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('supplier_id');
            $table->index('purchase_order_id');
            $table->index('status');
            $table->index('due_date');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
