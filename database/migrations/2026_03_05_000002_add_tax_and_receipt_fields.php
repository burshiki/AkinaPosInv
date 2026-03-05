<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('tax_rate', 5, 2)->default(0)->after('selling_price'); // e.g., 12.00 for 12% VAT
            $table->boolean('is_vat_exempt')->default(false)->after('tax_rate');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->decimal('tax_amount', 12, 2)->default(0)->after('discount_amount');
            $table->string('official_receipt_number', 50)->nullable()->unique()->after('receipt_number');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('tax_rate', 5, 2)->default(0)->after('cost_price');
            $table->decimal('tax_amount', 12, 2)->default(0)->after('tax_rate');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['tax_rate', 'is_vat_exempt']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['tax_amount', 'official_receipt_number']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['tax_rate', 'tax_amount']);
        });
    }
};
