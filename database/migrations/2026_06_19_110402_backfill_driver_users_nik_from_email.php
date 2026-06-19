<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Driver users created via the old DriverController had no NIK stored in the
 * users table (NIK was only in the now-dropped drivers table). Those accounts
 * have users.nik = NULL and cannot authenticate via Fortify (which uses nik).
 *
 * This migration sets a placeholder NIK so admins can still find and edit the
 * account. Admin MUST update to the correct NIK via the Users management page.
 */
return new class extends Migration
{
    public function up(): void
    {
        $affected = DB::table('users')
            ->join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->where('roles.name', 'driver')
            ->whereNull('users.nik')
            ->select('users.id')
            ->get();

        foreach ($affected as $user) {
            DB::table('users')->where('id', $user->id)->update([
                'nik' => 'FIXNIK-' . $user->id,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('users')
            ->where('nik', 'like', 'FIXNIK-%')
            ->update(['nik' => null]);
    }
};
