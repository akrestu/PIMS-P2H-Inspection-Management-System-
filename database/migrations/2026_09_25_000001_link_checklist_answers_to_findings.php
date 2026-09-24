<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Satu temuan bisa dilaporkan berulang kali (beberapa shift / beberapa hari)
 * selama belum selesai. Setiap jawaban "Tidak Layak" kini menunjuk ke temuan
 * yang menampungnya, dan temuan mencatat berapa kali serta kapan terakhir dilaporkan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->foreignId('p2h_finding_id')->nullable()->after('p2h_user_entry_id')
                ->constrained('p2h_findings')->nullOnDelete();
        });

        Schema::table('p2h_findings', function (Blueprint $table) {
            $table->unsignedInteger('jumlah_laporan')->default(1)->after('keterangan');
            $table->date('terakhir_dilaporkan')->nullable()->after('jumlah_laporan');
        });

        // Tautkan jawaban yang sudah punya temuan (relasi lama: finding → answer)
        DB::table('p2h_findings')->orderBy('id')->chunkById(500, function ($findings) {
            foreach ($findings as $finding) {
                DB::table('p2h_checklist_answers')
                    ->where('id', $finding->p2h_checklist_answer_id)
                    ->update(['p2h_finding_id' => $finding->id]);

                DB::table('p2h_findings')
                    ->where('id', $finding->id)
                    ->update(['terakhir_dilaporkan' => $finding->tanggal_temuan]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('p2h_findings', function (Blueprint $table) {
            $table->dropColumn(['jumlah_laporan', 'terakhir_dilaporkan']);
        });

        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('p2h_finding_id');
        });
    }
};
