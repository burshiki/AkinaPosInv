<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->foreignId('parent_warranty_id')
                ->nullable()
                ->after('id')
                ->constrained('warranties')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('warranties', function (Blueprint $table) {
            $table->dropForeign(['parent_warranty_id']);
            $table->dropColumn('parent_warranty_id');
        });
    }
};
