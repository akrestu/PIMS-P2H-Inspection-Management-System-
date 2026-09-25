<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            // Waktu approval pending dieskalasi ke admin karena PIC tidak merespons sampai akhir shift
            $table->timestamp('escalated_at')->nullable()->after('approved_at');
            $table->index(['approval_status', 'escalated_at']);
        });
    }

    public function down(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropIndex(['approval_status', 'escalated_at']);
            $table->dropColumn('escalated_at');
        });
    }
};
