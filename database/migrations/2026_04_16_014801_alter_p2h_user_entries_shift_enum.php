<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Expand enum to include all old + new values
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->enum('shift', ['Pagi', 'Siang', 'Malam', 'Shift I', 'Shift II'])->nullable()->change();
        });

        // Step 2: Migrate data
        DB::table('p2h_user_entries')->whereIn('shift', ['Pagi', 'Siang'])->update(['shift' => 'Shift I']);
        DB::table('p2h_user_entries')->where('shift', 'Malam')->update(['shift' => 'Shift II']);

        // Step 3: Lock down to new values only
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->enum('shift', ['Shift I', 'Shift II'])->nullable()->change();
        });
    }

    public function down(): void
    {
        // Step 1: Expand enum
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->enum('shift', ['Pagi', 'Siang', 'Malam', 'Shift I', 'Shift II'])->nullable()->change();
        });

        // Step 2: Reverse data
        DB::table('p2h_user_entries')->where('shift', 'Shift I')->update(['shift' => 'Pagi']);
        DB::table('p2h_user_entries')->where('shift', 'Shift II')->update(['shift' => 'Malam']);

        // Step 3: Restore old enum
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->enum('shift', ['Pagi', 'Siang', 'Malam'])->nullable()->change();
        });
    }
};
