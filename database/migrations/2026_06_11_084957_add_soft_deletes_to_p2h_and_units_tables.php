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
            $table->softDeletes();
        });

        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('units', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('p2h_sessions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('units', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
