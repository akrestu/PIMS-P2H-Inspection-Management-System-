<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Ringkasan & Laporan P2H (AI)
    |--------------------------------------------------------------------------
    |
    | Laporan selalu tersedia dari template. Jika diaktifkan dan GEMINI_API_KEY
    | terisi, AI merapikan narasi dari data yang sama. Gagal → kembali ke template.
    |
    */

    'ai_summary' => [
        'enabled' => (bool) env('AI_SUMMARY_ENABLED', true),
        'provider' => env('AI_SUMMARY_PROVIDER', 'gemini'),
        'model' => env('AI_SUMMARY_MODEL', 'gemini-flash-lite-latest'),
        'cache_minutes' => (int) env('AI_SUMMARY_CACHE_MINUTES', 60),
    ],

    /*
    |--------------------------------------------------------------------------
    | Temuan
    |--------------------------------------------------------------------------
    |
    | Temuan dianggap "berulang" jika item yang sama pada unit yang sama muncul
    | minimal `recurring_threshold` kali dalam `recurring_window_days` hari.
    |
    */

    'findings' => [
        'recurring_window_days' => 30,
        'recurring_threshold' => 3,
        'overdue_reminder_time' => env('P2H_OVERDUE_REMINDER_TIME', '07:00'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Servis Berkala
    |--------------------------------------------------------------------------
    |
    | Interval servis (KM/HM) per jenis unit. Servis terakhir diambil dari P2H
    | yang mencentang "Servis Berkala". Unit masuk pengingat bila sisa jarak
    | ke servis berikutnya ≤ `due_soon_km`.
    |
    */

    'service' => [
        'interval_km' => [
            'Light Vehicle' => 5000,
            'Bus' => 10000,
        ],
        'default_interval_km' => 5000,
        'due_soon_km' => 500,
    ],

    /*
    |--------------------------------------------------------------------------
    | Analitik BBM
    |--------------------------------------------------------------------------
    |
    | Unit "boros" bila rasio KM/liter < `wasteful_ratio` × rata-rata jenisnya.
    | Pengisian "tidak wajar" bila jarak sejak isi sebelumnya < `min_km_between_fills`
    | padahal liter ≥ `min_liters_flag`.
    |
    */

    'fuel' => [
        'wasteful_ratio' => 0.7,
        'min_km_between_fills' => 20,
        'min_liters_flag' => 20,
        // Lonjakan KM/HM di atas ini antar-pembacaan dianggap salah ketik dan diabaikan
        'max_km_jump' => 1500,
    ],

];
