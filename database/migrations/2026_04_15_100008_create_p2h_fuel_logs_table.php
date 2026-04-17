<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_fuel_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_user_entry_id')->constrained('p2h_user_entries')->onDelete('cascade');
            $table->integer('km_unit')->nullable();
            $table->decimal('jumlah_liter', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_fuel_logs');
    }
};
