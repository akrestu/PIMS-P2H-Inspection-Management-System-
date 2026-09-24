<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('p2h_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('p2h_checklist_answer_id')->unique()->constrained('p2h_checklist_answers')->cascadeOnDelete();
            $table->foreignId('p2h_user_entry_id')->constrained('p2h_user_entries')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->date('tanggal_temuan');
            $table->string('item_nama')->nullable();
            $table->string('kode_bahaya', 10)->nullable();
            $table->text('keterangan')->nullable();
            $table->text('tindakan_perbaikan')->nullable();
            $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('target_selesai')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('catatan_penutupan')->nullable();
            $table->timestamps();

            $table->index(['site_id', 'status']);
            $table->index('tanggal_temuan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('p2h_findings');
    }
};
