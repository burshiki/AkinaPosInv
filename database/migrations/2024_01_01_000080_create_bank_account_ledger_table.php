<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_account_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_account_id')->constrained('bank_accounts')->cascadeOnDelete();
            $table->string('type', 10); // in, out
            $table->decimal('amount', 12, 2);
            $table->decimal('running_balance', 12, 2);
            $table->string('description', 500);
            $table->string('category', 100)->nullable(); // sale, isp_collection, vendo_collection, expense, transfer, adjustment, debt_payment, other
            $table->string('reference_type', 100)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transacted_at');
            $table->timestamps();

            $table->index(['bank_account_id', 'transacted_at']);
            $table->index('type');
            $table->index('category');
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_account_ledger');
    }
};
