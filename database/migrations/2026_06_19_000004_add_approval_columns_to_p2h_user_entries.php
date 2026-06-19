<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            // null = tidak perlu approval; non-null = LV submitted by non-staff
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])
                  ->nullable()
                  ->after('justifikasi_kondisi');
            $table->foreignId('approver_id')
                  ->nullable()
                  ->after('approval_status')
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approver_id');
            $table->text('catatan_approval')->nullable()->after('approved_at');

            $table->index('approval_status', 'p2h_entries_approval_status_index');
        });
    }

    public function down(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropIndex('p2h_entries_approval_status_index');
            $table->dropForeign(['approver_id']);
            $table->dropColumn(['approval_status', 'approver_id', 'approved_at', 'catatan_approval']);
        });
    }
};
