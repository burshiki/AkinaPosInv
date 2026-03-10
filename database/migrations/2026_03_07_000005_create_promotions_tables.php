<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('type', 30); // percentage, fixed_amount, buy_x_get_y, bundle
            $table->decimal('value', 12, 2)->default(0); // discount value
            $table->unsignedInteger('buy_quantity')->nullable(); // for BOGO
            $table->unsignedInteger('get_quantity')->nullable();
            $table->decimal('min_purchase', 12, 2)->default(0); // minimum cart total
            $table->date('starts_at')->nullable();
            $table->date('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_count')->default(0);
            $table->string('applies_to', 20)->default('all'); // all, category, product
            $table->string('customer_tier', 20)->nullable(); // restrict to tier
            $table->timestamps();
        });

        // Which products/categories are included in a promotion
        Schema::create('promotion_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained()->cascadeOnDelete();
            $table->string('item_type', 20); // product, category
            $table->unsignedBigInteger('item_id');
            $table->timestamps();

            $table->index(['promotion_id', 'item_type', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_items');
        Schema::dropIfExists('promotions');
    }
};
