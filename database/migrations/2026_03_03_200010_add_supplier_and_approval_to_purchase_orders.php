<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            // Link to suppliers table (nullable so existing records aren't broken)
            $table->foreignId('supplier_id')
                ->nullable()
                ->after('po_number')
                ->constrained('suppliers')
                ->nullOnDelete();

            // Approval workflow columns
            $table->foreignId('approved_by')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('approved_at')->nullable()->after('ordered_at');
            $table->text('rejection_notes')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Supplier::class);
            $table->dropColumn('supplier_id');
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['approved_by', 'approved_at', 'rejection_notes']);
        });
    }
};
