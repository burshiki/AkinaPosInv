<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('cost_price', 12, 2);
            $table->integer('quantity_received');
            $table->integer('quantity_remaining');
            $table->string('reference_type', 50)->nullable(); // purchase_order, manual
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable();
            $table->date('received_at');
            $table->timestamps();

            $table->index(['product_id', 'quantity_remaining']);
            $table->index('expiry_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_lots');
    }
};
