<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('p2h_checklist_answers', 'item_nama')) {
            Schema::table('p2h_checklist_answers', function (Blueprint $table) {
                $table->string('item_nama')->nullable()->after('inspection_item_id');
            });
        }

        if (! Schema::hasColumn('p2h_checklist_answers', 'item_section')) {
            Schema::table('p2h_checklist_answers', function (Blueprint $table) {
                $table->string('item_section', 10)->nullable()->after('item_nama');
            });
        }

        if (! Schema::hasColumn('p2h_checklist_answers', 'item_kode_bahaya')) {
            Schema::table('p2h_checklist_answers', function (Blueprint $table) {
                $table->string('item_kode_bahaya', 10)->nullable()->after('item_section');
            });
        }

        if (! Schema::hasColumn('p2h_checklist_answers', 'item_urutan')) {
            Schema::table('p2h_checklist_answers', function (Blueprint $table) {
                $table->unsignedInteger('item_urutan')->nullable()->after('item_kode_bahaya');
            });
        }

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

                $updates = [];
                if ($answer->item_nama === null) {
                    $updates['item_nama'] = $item->nama_item;
                }
                if ($answer->item_section === null) {
                    $updates['item_section'] = $item->section;
                }
                if ($answer->item_kode_bahaya === null) {
                    $updates['item_kode_bahaya'] = $item->kode_bahaya;
                }
                if ($answer->item_urutan === null) {
                    $updates['item_urutan'] = $item->urutan;
                }

                if ($updates !== []) {
                    DB::table('p2h_checklist_answers')->where('id', $answer->id)->update($updates);
                }
            }
        });
    }

    public function down(): void
    {
        $columns = collect(['item_nama', 'item_section', 'item_kode_bahaya', 'item_urutan'])
            ->filter(fn (string $column) => Schema::hasColumn('p2h_checklist_answers', $column))
            ->values()
            ->all();

        if ($columns !== []) {
            Schema::table('p2h_checklist_answers', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
