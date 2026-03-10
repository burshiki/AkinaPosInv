<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Attribute definitions (e.g. Color, Size)
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100); // e.g. Color, Size, Weight
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Attribute values (e.g. Red, Blue, Small, Large)
        Schema::create('product_attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_attribute_id')->constrained()->cascadeOnDelete();
            $table->string('value', 100); // e.g. Red, Small
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Product variants (specific combinations with their own SKU/price/stock)
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku')->nullable()->unique();
            $table->string('barcode')->nullable()->unique();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->decimal('selling_price', 12, 2)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('product_id');
        });

        // Pivot: which attribute values does a variant have
        Schema::create('product_variant_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_attribute_value_id')->constrained()->cascadeOnDelete();

            $table->unique(['product_variant_id', 'product_attribute_value_id'], 'pva_unique');
        });

        // Flag parent products that have variants
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('has_variants')->default(false)->after('is_component');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('has_variants');
        });
        Schema::dropIfExists('product_variant_attributes');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_attribute_values');
        Schema::dropIfExists('product_attributes');
    }
};
