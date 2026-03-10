<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('name', 100);
            $table->string('type', 25); // regular, special_non_working, special_working
            $table->integer('year');
            $table->timestamps();

            $table->index('date');
            $table->index('year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('holidays');
    }
};
