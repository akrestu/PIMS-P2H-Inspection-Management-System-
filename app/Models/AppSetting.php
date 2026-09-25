<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    public const SUPPORTED_SHIFTS = ['Shift I', 'Shift II'];

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        cache()->forget(self::cacheKey($key));
    }

    /** Nilai setting dari cache (dibaca di setiap request Inertia); dibuang saat set(). */
    public static function cached(string $key, mixed $default = null): mixed
    {
        return cache()->rememberForever(self::cacheKey($key), fn () => static::get($key, $default));
    }

    private static function cacheKey(string $key): string
    {
        return "app_setting_{$key}";
    }

    /** @return list<string> */
    public static function shifts(): array
    {
        $configured = collect(static::cached('shifts', self::SUPPORTED_SHIFTS))
            ->filter(fn ($shift) => is_string($shift) && in_array($shift, self::SUPPORTED_SHIFTS, true))
            ->unique()
            ->values()
            ->all();

        return $configured === [] ? self::SUPPORTED_SHIFTS : $configured;
    }
}
