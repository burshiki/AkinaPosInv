<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assembly_builds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('quantity');
            $table->foreignId('built_by')->constrained('users')->restrictOnDelete();
            $table->json('component_snapshot'); // JSON array of {component_id, name, sku, qty_used, cost_at_build}
            $table->decimal('total_cost', 12, 2)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->timestamp('built_at');
            $table->timestamps();

            $table->index(['product_id', 'built_at']);
            $table->index('built_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assembly_builds');
    }
};
