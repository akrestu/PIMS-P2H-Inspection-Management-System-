<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Copy nik, department + jenis_unit from drivers → users
        $drivers = DB::table('drivers')->get();
        foreach ($drivers as $driver) {
            DB::table('users')->where('id', $driver->user_id)->update([
                'nik'        => $driver->nik,
                'department' => $driver->department,
                'jenis_unit' => $driver->jenis_unit ?? null,
            ]);
        }

        // 2. Create user_unit pivot (replaces driver_unit)
        Schema::create('user_unit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'unit_id']);
        });

        // 3. Migrate driver_unit → user_unit
        $driverUnitRows = DB::table('driver_unit')
            ->join('drivers', 'drivers.id', '=', 'driver_unit.driver_id')
            ->select('drivers.user_id', 'driver_unit.unit_id', 'driver_unit.created_at', 'driver_unit.updated_at')
            ->get();

        foreach ($driverUnitRows as $row) {
            DB::table('user_unit')->insertOrIgnore([
                'user_id'    => $row->user_id,
                'unit_id'    => $row->unit_id,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        }

        // 4. Drop old tables (driver_unit first due to FK)
        Schema::dropIfExists('driver_unit');
        Schema::dropIfExists('drivers');
    }

    public function down(): void
    {
        // Recreate drivers table
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('nik')->unique();
            $table->string('nama');
            $table->string('department');
            $table->enum('jenis_unit', ['Bus', 'Light Vehicle'])->nullable()->default(null);
            $table->timestamps();
        });

        // Recreate driver_unit pivot
        Schema::create('driver_unit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained()->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['driver_id', 'unit_id']);
        });

        Schema::dropIfExists('user_unit');
    }
};
