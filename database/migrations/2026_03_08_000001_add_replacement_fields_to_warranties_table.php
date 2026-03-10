<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->boolean('is_replacement')->default(false)->after('tracking_number');
            $table->text('replacement_notes')->nullable()->after('is_replacement');
            $table->string('received_serial_number')->nullable()->after('replacement_notes');
            $table->text('received_notes')->nullable()->after('received_serial_number');
        });
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->dropColumn(['is_replacement', 'replacement_notes', 'received_serial_number', 'received_notes']);
        });
    }
};
