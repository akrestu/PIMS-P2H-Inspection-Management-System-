<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('jabatan', ['Sr.Staff', 'Staff', 'Non Staff'])->nullable()->after('nik');
            $table->string('department')->nullable()->after('jabatan');
            $table->string('jenis_unit')->nullable()->after('department');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['jabatan', 'department', 'jenis_unit']);
        });
    }
};
