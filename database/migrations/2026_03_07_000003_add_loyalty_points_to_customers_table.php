<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedInteger('loyalty_points')->default(0)->after('is_active');
            $table->string('loyalty_tier', 20)->default('standard')->after('loyalty_points');
        });

        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20); // earn, redeem, adjust
            $table->integer('points');
            $table->unsignedInteger('balance_after');
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index('customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['loyalty_points', 'loyalty_tier']);
        });
    }
};
