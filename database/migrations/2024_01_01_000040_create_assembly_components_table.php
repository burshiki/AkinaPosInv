<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assembly_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assembly_product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('component_product_id')->constrained('products')->cascadeOnDelete();
            $table->integer('quantity_needed')->default(1);
            $table->timestamps();

            $table->unique(['assembly_product_id', 'component_product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assembly_components');
    }
};
