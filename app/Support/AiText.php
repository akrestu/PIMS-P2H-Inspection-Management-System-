<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\Agent;

/**
 * Pemanggilan AI teks bersama: cek konfigurasi, cache per isi prompt, dan
 * tidak pernah melempar exception — caller cukup fallback bila hasilnya null.
 */
class AiText
{
    public static function enabled(): bool
    {
        return config('p2h.ai_summary.enabled')
            && filled(config('ai.providers.'.config('p2h.ai_summary.provider').'.key'));
    }

    public static function generate(Agent $agent, string $prompt): ?string
    {
        if (! self::enabled()) {
            return null;
        }

        // Cache per prompt + instruksi + model: data/format berubah → key baru
        $cacheKey = 'p2h_ai:'.class_basename($agent).':'.md5($prompt.$agent->instructions().config('p2h.ai_summary.model'));

        try {
            return Cache::remember($cacheKey, now()->addMinutes(config('p2h.ai_summary.cache_minutes')), function () use ($agent, $prompt) {
                $text = trim($agent->prompt(
                    $prompt,
                    provider: config('p2h.ai_summary.provider'),
                    model: config('p2h.ai_summary.model'),
                )->text);

                if ($text === '') {
                    throw new \RuntimeException('Respons AI kosong.');
                }

                return $text;
            });
        } catch (\Throwable $e) {
            Log::warning('Pemanggilan AI gagal, fallback.', ['agent' => class_basename($agent), 'error' => $e->getMessage()]);

            return null;
        }
    }
}
