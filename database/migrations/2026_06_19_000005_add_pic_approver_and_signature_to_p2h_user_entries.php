<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->foreignId('pic_approver_id')
                ->nullable()
                ->after('approval_status')
                ->constrained('users')
                ->nullOnDelete();

            $table->string('approver_signature_url')->nullable()->after('catatan_approval');
        });

        // Reset pending entries yang tidak punya PIC (data lama sebelum fitur ini)
        DB::table('p2h_user_entries')
            ->where('approval_status', 'pending')
            ->whereNull('pic_approver_id')
            ->update([
                'approval_status' => null,
                'approver_id'     => null,
                'approved_at'     => null,
            ]);
    }

    public function down(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropForeign(['pic_approver_id']);
            $table->dropColumn(['pic_approver_id', 'approver_signature_url']);
        });
    }
};
