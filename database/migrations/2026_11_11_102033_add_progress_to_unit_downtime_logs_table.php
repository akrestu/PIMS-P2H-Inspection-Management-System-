<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Progress perbaikan unit BD/PM yang diperbarui admin, tampil di Daily Report.
     */
    public function up(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->string('progress', 500)->nullable()->after('keterangan');
            $table->timestamp('progress_updated_at')->nullable()->after('progress');
        });
    }

    public function down(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->dropColumn(['progress', 'progress_updated_at']);
        });
    }
};
