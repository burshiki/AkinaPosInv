<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number', 50)->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('customer_name')->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('payment_method', 50); // cash, online, credit
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->nullOnDelete();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('discount_amount', 12, 2)->default(0.00);
            $table->decimal('total', 12, 2)->default(0.00);
            $table->decimal('amount_tendered', 12, 2)->nullable();
            $table->decimal('change_amount', 12, 2)->nullable();
            $table->string('status', 50)->default('completed'); // completed, voided, refunded
            $table->text('notes')->nullable();
            $table->timestamp('sold_at');
            $table->timestamps();
            $table->softDeletes();

            $table->index('receipt_number');
            $table->index('user_id');
            $table->index('payment_method');
            $table->index('status');
            $table->index('sold_at');
            $table->index('bank_account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
