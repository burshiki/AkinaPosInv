<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sss_contribution_table', function (Blueprint $table) {
            $table->id();
            $table->decimal('range_from', 12, 2);
            $table->decimal('range_to', 12, 2);
            $table->decimal('msc', 12, 2);
            $table->decimal('employee_share', 12, 2);
            $table->decimal('employer_share', 12, 2);
            $table->decimal('ec_share', 12, 2);
            $table->decimal('total_contribution', 12, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('range_from');
            $table->index('range_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sss_contribution_table');
    }
};
