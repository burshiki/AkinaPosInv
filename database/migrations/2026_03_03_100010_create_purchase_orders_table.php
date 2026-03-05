<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number', 50)->unique();
            $table->string('supplier_name');
            $table->string('supplier_phone', 50)->nullable();
            $table->string('supplier_email')->nullable();
            $table->text('supplier_address')->nullable();
            // draft | ordered | partially_received | received | cancelled
            $table->string('status', 50)->default('draft');
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0.00);
            $table->decimal('total', 12, 2)->default(0.00);
            $table->timestamp('ordered_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('po_number');
            $table->index('status');
            $table->index('supplier_name');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_orders');
    }
};
