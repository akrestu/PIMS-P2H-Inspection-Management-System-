<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidSignatureDataUrl implements ValidationRule
{
    public const MAX_ENCODED_LENGTH = 1_500_000;

    public const MAX_DECODED_BYTES = 1_048_576;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || strlen($value) > self::MAX_ENCODED_LENGTH) {
            $fail('Ukuran tanda tangan terlalu besar. Maksimal 1 MB.');

            return;
        }

        if (! preg_match('/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/]+={0,2})$/', $value, $matches)) {
            $fail('Format data tanda tangan tidak valid.');

            return;
        }

        $image = base64_decode($matches[2], true);

        if ($image === false || strlen($image) > self::MAX_DECODED_BYTES) {
            $fail('Ukuran tanda tangan terlalu besar. Maksimal 1 MB.');

            return;
        }

        $imageInfo = @getimagesizefromstring($image);
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($image);

        if ($imageInfo === false || ! in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
            $fail('Tanda tangan harus berupa gambar PNG, JPEG, atau WebP yang valid.');

            return;
        }

        if ($imageInfo[0] > 4096 || $imageInfo[1] > 4096) {
            $fail('Dimensi gambar tanda tangan terlalu besar.');
        }
    }
}
