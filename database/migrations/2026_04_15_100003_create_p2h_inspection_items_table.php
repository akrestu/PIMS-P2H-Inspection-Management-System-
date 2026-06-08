<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_inspection_items', function (Blueprint $table) {
            $table->id();
            $table->string('nama_item');
            $table->enum('section', ['A', 'B', 'C']);
            $table->enum('kode_bahaya', ['AA', 'A']);
            $table->integer('urutan');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_inspection_items');
    }
};
