<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sesi yang sudah dihapus sebelumnya meninggalkan entry aktif, yang akan muncul
 * kembali bila sesi di-restore. Hapus (soft delete) entry tersebut.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('p2h_user_entries')
            ->whereNull('deleted_at')
            ->whereIn('p2h_session_id', DB::table('p2h_sessions')->whereNotNull('deleted_at')->select('id'))
            ->update(['deleted_at' => now()]);
    }

    public function down(): void
    {
        // Tidak dapat dibedakan dari entry yang dihapus manual; dibiarkan terhapus.
    }
};
