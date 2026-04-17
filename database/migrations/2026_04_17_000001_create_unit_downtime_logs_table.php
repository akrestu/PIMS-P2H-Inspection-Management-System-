<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_downtime_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->onDelete('cascade');
            $table->enum('tipe', ['BD', 'PM', 'Servis Berkala']);
            $table->timestamp('jam_mulai');
            $table->timestamp('jam_selesai')->nullable(); // null = masih ongoing
            $table->text('keterangan')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['unit_id', 'jam_mulai']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_downtime_logs');
    }
};
