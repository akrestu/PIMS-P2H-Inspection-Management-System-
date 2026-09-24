<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_findings', function (Blueprint $table) {
            $table->string('foto_penutupan')->nullable()->after('catatan_penutupan');
            $table->timestamp('overdue_notified_at')->nullable()->after('foto_penutupan');
            $table->index(['unit_id', 'item_nama', 'tanggal_temuan']);
        });
    }

    public function down(): void
    {
        Schema::table('p2h_findings', function (Blueprint $table) {
            $table->dropIndex(['unit_id', 'item_nama', 'tanggal_temuan']);
            $table->dropColumn(['foto_penutupan', 'overdue_notified_at']);
        });
    }
};
