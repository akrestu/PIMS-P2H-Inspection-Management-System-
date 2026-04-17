<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: Expand enum to include all old + new values
        DB::statement("ALTER TABLE p2h_user_entries MODIFY COLUMN shift ENUM('Pagi','Siang','Malam','Shift I','Shift II') NULL");

        // Step 2: Migrate data
        DB::table('p2h_user_entries')->whereIn('shift', ['Pagi', 'Siang'])->update(['shift' => 'Shift I']);
        DB::table('p2h_user_entries')->where('shift', 'Malam')->update(['shift' => 'Shift II']);

        // Step 3: Lock down to new values only
        DB::statement("ALTER TABLE p2h_user_entries MODIFY COLUMN shift ENUM('Shift I','Shift II') NULL");
    }

    public function down(): void
    {
        // Step 1: Expand enum
        DB::statement("ALTER TABLE p2h_user_entries MODIFY COLUMN shift ENUM('Pagi','Siang','Malam','Shift I','Shift II') NULL");

        // Step 2: Reverse data
        DB::table('p2h_user_entries')->where('shift', 'Shift I')->update(['shift' => 'Pagi']);
        DB::table('p2h_user_entries')->where('shift', 'Shift II')->update(['shift' => 'Malam']);

        // Step 3: Restore old enum
        DB::statement("ALTER TABLE p2h_user_entries MODIFY COLUMN shift ENUM('Pagi','Siang','Malam') NULL");
    }
};
