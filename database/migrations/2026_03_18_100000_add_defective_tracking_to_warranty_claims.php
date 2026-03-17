<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranty_claims', function (Blueprint $table) {
            // Tracks the defective unit returned by the customer after a from-stock replacement.
            // null        = not applicable (repair/refund resolution)
            // pending     = defective unit in hand, not yet sent to supplier
            // sent        = sent to supplier for repair/replacement
            // received    = supplier returned it, added to inventory
            $table->string('defective_status')->nullable()->after('resolved_at');
            $table->foreignId('defective_supplier_id')
                ->nullable()
                ->constrained('suppliers')
                ->nullOnDelete()
                ->after('defective_status');
            $table->string('defective_tracking_number')->nullable()->after('defective_supplier_id');
            $table->timestamp('defective_received_at')->nullable()->after('defective_tracking_number');
        });
    }

    public function down(): void
    {
        Schema::table('warranty_claims', function (Blueprint $table) {
            $table->dropForeign(['defective_supplier_id']);
            $table->dropColumn([
                'defective_status',
                'defective_supplier_id',
                'defective_tracking_number',
                'defective_received_at',
            ]);
        });
    }
};
