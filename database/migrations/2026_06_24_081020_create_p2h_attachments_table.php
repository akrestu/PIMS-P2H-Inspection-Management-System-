<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_user_entry_id')->constrained('p2h_user_entries')->cascadeOnDelete();
            $table->unsignedBigInteger('inspection_item_id')->nullable(); // null = lampiran utama form
            $table->string('path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_attachments');
    }
};
