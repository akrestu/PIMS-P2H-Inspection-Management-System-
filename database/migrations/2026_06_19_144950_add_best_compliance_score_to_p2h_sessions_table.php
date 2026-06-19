<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('p2h_sessions', function (Blueprint $table) {
            // Score terbaik dari seluruh user entries pada sesi ini (0-100), disimpan saat submit
            $table->decimal('best_compliance_score', 5, 1)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('p2h_sessions', function (Blueprint $table) {
            $table->dropColumn('best_compliance_score');
        });
    }
};
