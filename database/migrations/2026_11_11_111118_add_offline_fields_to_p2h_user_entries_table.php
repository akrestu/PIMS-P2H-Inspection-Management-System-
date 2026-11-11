<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Antrean P2H offline (docs/11): client_uuid membuat pengiriman ulang idempoten,
     * submitted_offline menandai entry yang dikirim dari antrean HP.
     */
    public function up(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->uuid('client_uuid')->nullable()->unique()->after('user_slot');
            $table->boolean('submitted_offline')->default(false)->after('submitted_at');
        });
    }

    public function down(): void
    {
        Schema::table('p2h_user_entries', function (Blueprint $table) {
            $table->dropUnique(['client_uuid']);
            $table->dropColumn(['client_uuid', 'submitted_offline']);
        });
    }
};
