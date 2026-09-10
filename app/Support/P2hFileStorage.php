<?php

namespace App\Support;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class P2hFileStorage
{
    public static function response(string $path): StreamedResponse
    {
        $disk = self::diskContaining($path);
        abort_unless($disk, 404);

        return $disk->response($path, basename($path), [
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public static function absolutePath(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return self::diskContaining($path)?->path($path);
    }

    public static function delete(array|string $paths): void
    {
        Storage::disk('local')->delete($paths);
        Storage::disk('public')->delete($paths);
    }

    private static function diskContaining(string $path): ?FilesystemAdapter
    {
        foreach (['local', 'public'] as $name) {
            $disk = Storage::disk($name);
            if ($disk->exists($path)) {
                return $disk;
            }
        }

        return null;
    }
}
