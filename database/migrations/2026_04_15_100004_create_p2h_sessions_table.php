<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units');
            $table->date('tanggal');
            $table->text('catatan_khusus')->nullable();
            $table->enum('status', ['open', 'completed'])->default('open');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['unit_id', 'tanggal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_sessions');
    }
};
