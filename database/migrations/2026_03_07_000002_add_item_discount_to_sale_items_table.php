<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->default(0)->after('subtotal');
            $table->string('discount_type', 10)->default('amount')->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['discount_amount', 'discount_type']);
        });
    }
};
