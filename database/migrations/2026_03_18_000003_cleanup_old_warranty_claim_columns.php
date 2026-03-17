<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            // Drop FK before dropping column
            $table->dropForeign(['supplier_id']);

            $table->dropColumn([
                'check_reason',
                'supplier_id',
                'tracking_number',
                'resolution_type',
                'received_serial_number',
                'received_notes',
                'is_replacement',
                'replacement_notes',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->text('check_reason')->nullable();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('tracking_number')->nullable();
            $table->string('resolution_type')->nullable();
            $table->string('received_serial_number')->nullable();
            $table->text('received_notes')->nullable();
            $table->boolean('is_replacement')->default(false);
            $table->text('replacement_notes')->nullable();
        });
    }
};
