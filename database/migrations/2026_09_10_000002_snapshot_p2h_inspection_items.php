<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->string('item_nama')->nullable()->after('inspection_item_id');
            $table->string('item_section', 10)->nullable()->after('item_nama');
            $table->string('item_kode_bahaya', 10)->nullable()->after('item_section');
            $table->unsignedInteger('item_urutan')->nullable()->after('item_kode_bahaya');
        });

        DB::table('p2h_checklist_answers')->orderBy('id')->chunkById(500, function ($answers) {
            $items = DB::table('p2h_inspection_items')
                ->whereIn('id', $answers->pluck('inspection_item_id')->unique())
                ->get()
                ->keyBy('id');

            foreach ($answers as $answer) {
                $item = $items->get($answer->inspection_item_id);
                if (! $item) {
                    continue;
                }

                DB::table('p2h_checklist_answers')->where('id', $answer->id)->update([
                    'item_nama' => $item->nama_item,
                    'item_section' => $item->section,
                    'item_kode_bahaya' => $item->kode_bahaya,
                    'item_urutan' => $item->urutan,
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->dropColumn(['item_nama', 'item_section', 'item_kode_bahaya', 'item_urutan']);
        });
    }
};
