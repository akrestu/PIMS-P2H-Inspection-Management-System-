<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class SignatureImage
{
    public static function store(string $dataUrl, string $prefix = ''): string
    {
        if (! preg_match('/^data:image\/(png|jpeg|webp);base64,(.+)$/', $dataUrl, $matches)) {
            throw new RuntimeException('Data tanda tangan tidak valid.');
        }

        $image = base64_decode($matches[2], true);

        if ($image === false) {
            throw new RuntimeException('Data tanda tangan tidak valid.');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($image);
        $extension = match ($mime) {
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => throw new RuntimeException('Format tanda tangan tidak didukung.'),
        };

        $path = 'signatures/'.$prefix.Str::uuid().".{$extension}";

        if (! Storage::disk('local')->put($path, $image)) {
            throw new RuntimeException('Tanda tangan gagal disimpan.');
        }

        return $path;
    }
}
