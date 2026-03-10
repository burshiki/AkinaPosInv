<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bill_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            // cash, check, bank_transfer, online
            $table->string('payment_method', 30);
            $table->decimal('amount', 12, 2);
            $table->foreignId('bank_account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cash_drawer_session_id')->nullable()->constrained()->nullOnDelete();
            $table->string('check_number', 100)->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->foreignId('paid_by')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();

            $table->index('bill_id');
            $table->index('payment_method');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bill_payments');
    }
};
