<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->enum('kondisi_akhir', ['Layak Pakai', 'BD'])->nullable()->after('submitted_at');
            $table->text('justifikasi_kondisi')->nullable()->after('kondisi_akhir');
        });
    }

    public function down(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropColumn(['kondisi_akhir', 'justifikasi_kondisi']);
        });
    }
};
