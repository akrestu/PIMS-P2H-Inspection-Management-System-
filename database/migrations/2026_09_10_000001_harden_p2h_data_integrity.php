<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->unique(
                ['p2h_user_entry_id', 'inspection_item_id'],
                'p2h_answers_entry_item_unique'
            );
        });

        Schema::table('p2h_attachments', function (Blueprint $table) {
            $table->foreign('inspection_item_id', 'p2h_attachments_item_foreign')
                ->references('id')
                ->on('p2h_inspection_items')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('p2h_attachments', function (Blueprint $table) {
            $table->dropForeign('p2h_attachments_item_foreign');
        });

        Schema::table('p2h_checklist_answers', function (Blueprint $table) {
            $table->dropUnique('p2h_answers_entry_item_unique');
        });
    }
};
