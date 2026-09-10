<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $this->moveReferencedFiles('public', 'local');
    }

    public function down(): void
    {
        $this->moveReferencedFiles('local', 'public');
    }

    private function moveReferencedFiles(string $from, string $to): void
    {
        DB::table('p2h_user_entries')->orderBy('id')->chunkById(250, function ($entries) use ($from, $to) {
            foreach ($entries as $entry) {
                $this->move($entry->paraf_url, $from, $to);
                $this->move($entry->approver_signature_url, $from, $to);
            }
        });

        DB::table('p2h_attachments')->orderBy('id')->chunkById(250, function ($attachments) use ($from, $to) {
            foreach ($attachments as $attachment) {
                $this->move($attachment->path, $from, $to);
            }
        });
    }

    private function move(?string $path, string $from, string $to): void
    {
        if (! $path || ! Storage::disk($from)->exists($path)) {
            return;
        }

        if (Storage::disk($to)->exists($path)) {
            Storage::disk($from)->delete($path);

            return;
        }

        $stream = Storage::disk($from)->readStream($path);
        if ($stream === null || $stream === false) {
            return;
        }

        try {
            if (Storage::disk($to)->writeStream($path, $stream)) {
                Storage::disk($from)->delete($path);
            }
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }
};
