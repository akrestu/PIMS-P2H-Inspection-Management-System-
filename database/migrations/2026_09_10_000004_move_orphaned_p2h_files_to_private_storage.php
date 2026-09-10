<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $this->moveDirectories('public', 'local');
    }

    public function down(): void
    {
        $this->moveDirectories('local', 'public');
    }

    private function moveDirectories(string $from, string $to): void
    {
        foreach (['signatures', 'p2h-attachments'] as $directory) {
            foreach (Storage::disk($from)->allFiles($directory) as $path) {
                if (Storage::disk($to)->exists($path)) {
                    Storage::disk($from)->delete($path);

                    continue;
                }

                $stream = Storage::disk($from)->readStream($path);
                if ($stream === null || $stream === false) {
                    continue;
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
        }
    }
};
