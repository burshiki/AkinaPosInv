<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warranties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('sale_item_id')->constrained('sale_items')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('receipt_number');
            $table->string('customer_name')->nullable();
            $table->unsignedSmallInteger('warranty_months');
            $table->string('serial_number')->nullable();
            $table->date('expires_at')->nullable();
            $table->string('status')->default('pending'); // pending | active | expired
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('sale_id');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warranties');
    }
};
