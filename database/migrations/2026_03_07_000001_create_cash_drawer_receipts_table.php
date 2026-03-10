<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_drawer_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_drawer_session_id')->constrained('cash_drawer_sessions')->cascadeOnDelete();
            $table->foreignId('performed_by')->constrained('users');
            $table->string('category'); // isp_collection, service_fee, loan_repayment, refund, other
            $table->decimal('amount', 12, 2);
            $table->string('description');
            $table->timestamps();

            $table->index('cash_drawer_session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_drawer_receipts');
    }
};
