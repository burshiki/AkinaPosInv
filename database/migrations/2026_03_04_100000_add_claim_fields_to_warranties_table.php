<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            // status will now include: pending | active | checking | confirmed | sent_to_supplier | expired
            $table->text('check_reason')->nullable()->after('notes');
            $table->foreignId('supplier_id')
                  ->nullable()
                  ->constrained('suppliers')
                  ->nullOnDelete()
                  ->after('check_reason');
            $table->string('tracking_number')->nullable()->after('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn(['check_reason', 'supplier_id', 'tracking_number']);
        });
    }
};
