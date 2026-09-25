<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jabatan diganti nama & dibuat wajib:
 * Sr.Staff → Approval, Staff → User LV 2, Non Staff / kosong → User LV 1.
 */
return new class extends Migration
{
    private const MAP = [
        'Sr.Staff' => 'Approval',
        'Staff' => 'User LV 2',
        'Non Staff' => 'User LV 1',
    ];

    public function up(): void
    {
        $this->setEnum([...array_keys(self::MAP), ...array_values(self::MAP)], nullable: true);

        foreach (self::MAP as $old => $new) {
            DB::table('users')->where('jabatan', $old)->update(['jabatan' => $new]);
        }
        DB::table('users')->whereNull('jabatan')->update(['jabatan' => 'User LV 1']);

        $this->setEnum(array_values(self::MAP), nullable: false);
    }

    public function down(): void
    {
        $this->setEnum([...array_keys(self::MAP), ...array_values(self::MAP)], nullable: true);

        foreach (self::MAP as $old => $new) {
            DB::table('users')->where('jabatan', $new)->update(['jabatan' => $old]);
        }

        $this->setEnum(array_keys(self::MAP), nullable: true);
    }

    /** @param  list<string>  $values */
    private function setEnum(array $values, bool $nullable): void
    {
        Schema::table('users', function (Blueprint $table) use ($values, $nullable) {
            $table->enum('jabatan', $values)->nullable($nullable)->change();
        });
    }
};
