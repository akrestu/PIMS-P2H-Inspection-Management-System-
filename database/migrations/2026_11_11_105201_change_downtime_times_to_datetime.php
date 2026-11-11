<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom TIMESTAMP NOT NULL pertama di MySQL dengan explicit_defaults_for_timestamp=OFF
     * otomatis mendapat ON UPDATE CURRENT_TIMESTAMP, sehingga jam_mulai berubah ke "sekarang"
     * setiap kali log diedit (mis. mengisi progress). DATETIME tidak pernah diisi otomatis.
     */
    public function up(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->dateTime('jam_mulai')->change();
            $table->dateTime('jam_selesai')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->timestamp('jam_mulai')->change();
            $table->timestamp('jam_selesai')->nullable()->change();
        });
    }
};
