<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_checklist_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_user_entry_id')->constrained('p2h_user_entries')->onDelete('cascade');
            $table->foreignId('inspection_item_id')->constrained('p2h_inspection_items');
            $table->enum('kondisi', ['Layak', 'Tidak Layak']);
            $table->string('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_checklist_answers');
    }
};
