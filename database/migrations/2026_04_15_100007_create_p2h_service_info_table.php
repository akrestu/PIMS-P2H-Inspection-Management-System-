<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_service_info', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_session_id')->constrained('p2h_sessions')->onDelete('cascade')->unique();
            $table->boolean('servis_mingguan')->default(false);
            $table->boolean('servis_berkala')->default(false);
            $table->boolean('unschedule_breakdown')->default(false);
            $table->string('lainnya')->nullable();
            $table->text('catatan_servis')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_service_info');
    }
};
