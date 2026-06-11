<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fix: unit_downtime_logs.created_by — tambah restrictOnDelete agar user
        // tidak bisa dihapus jika masih punya log downtime (proteksi audit trail)
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
        });

        // Fix: p2h_sessions.created_by — tambah restrictOnDelete
        Schema::table('p2h_sessions', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
        });

        // Tambah missing indexes untuk performa query
        Schema::table('p2h_sessions', function (Blueprint $table) {
            $table->index(['created_by', 'tanggal'], 'p2h_sessions_created_by_tanggal_index');
        });

        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->index('user_id', 'p2h_user_entries_user_id_index');
            $table->index('submitted_at', 'p2h_user_entries_submitted_at_index');
        });

        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->index('inspection_item_id', 'p2h_checklist_answers_item_id_index');
        });

        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->index('created_by', 'unit_downtime_logs_created_by_index');
        });
    }

    public function down(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropIndex('unit_downtime_logs_created_by_index');
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('p2h_sessions', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropIndex('p2h_sessions_created_by_tanggal_index');
            $table->foreign('created_by')->references('id')->on('users');
        });

        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropIndex('p2h_user_entries_user_id_index');
            $table->dropIndex('p2h_user_entries_submitted_at_index');
        });

        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->dropIndex('p2h_checklist_answers_item_id_index');
        });
    }
};
