<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bir_tax_table', function (Blueprint $table) {
            $table->id();
            $table->string('tax_status', 10);
            $table->decimal('range_from', 12, 2);
            $table->decimal('range_to', 12, 2)->nullable();
            $table->decimal('base_tax', 12, 2)->default(0.00);
            $table->decimal('excess_over', 12, 2)->default(0.00);
            $table->decimal('tax_rate', 5, 4)->default(0.0000);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tax_status', 'range_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bir_tax_table');
    }
};
