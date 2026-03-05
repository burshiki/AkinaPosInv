<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('inventory_session_id')
                  ->nullable()
                  ->constrained('inventory_sessions')
                  ->nullOnDelete();
            $table->string('type'); // manual | inventory_count
            $table->integer('before_qty');
            $table->integer('change_qty'); // positive = added, negative = removed
            $table->integer('after_qty');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index('product_id');
            $table->index('type');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustments');
    }
};
