<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_user_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_session_id')->constrained('p2h_sessions')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users');
            $table->tinyInteger('user_slot');
            $table->integer('km_awal')->nullable();
            $table->string('paraf_url')->nullable();
            $table->enum('shift', ['Pagi', 'Siang', 'Malam'])->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['p2h_session_id', 'user_slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_user_entries');
    }
};
