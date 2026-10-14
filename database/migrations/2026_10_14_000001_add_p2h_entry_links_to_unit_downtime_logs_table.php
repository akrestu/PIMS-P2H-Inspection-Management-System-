<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            // P2H yang membuka (kondisi BD) dan menutup (Layak Pakai) log ini secara otomatis
            $table->foreignId('opened_by_entry_id')->nullable()->after('created_by')
                ->constrained('p2h_user_entries')->nullOnDelete();
            $table->foreignId('closed_by_entry_id')->nullable()->after('opened_by_entry_id')
                ->constrained('p2h_user_entries')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('unit_downtime_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('closed_by_entry_id');
            $table->dropConstrainedForeignId('opened_by_entry_id');
        });
    }
};
