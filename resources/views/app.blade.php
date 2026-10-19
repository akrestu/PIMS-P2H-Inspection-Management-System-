<!DOCTYPE html>
@php
    // Cookie `appearance` tidak dienkripsi — hanya nilai yang dikenal yang dipakai
    $theme = in_array($appearance ?? 'system', ['light', 'dark', 'hc'], true) ? $appearance : 'system';
@endphp
<html lang="id" @if ($theme !== 'system') data-theme="{{ $theme }}" @endif>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

        {{-- Set data-theme / data-motion sebelum paint agar tidak berkedip (docs/01) --}}
        <script>
            (function () {
                var root = document.documentElement;
                var valid = ['light', 'dark', 'hc', 'system'];
                var theme = '{{ $theme }}';
                try {
                    var stored = localStorage.getItem('pims.theme');
                    if (valid.indexOf(stored) !== -1) theme = stored;
                    if (localStorage.getItem('pims.motion') === 'reduced') root.dataset.motion = 'reduced';
                } catch (e) {}
                if (theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                root.dataset.theme = theme;
            })();
        </script>

        {{-- Latar sebelum CSS termuat --}}
        <style>
            html { background-color: #FFFFFF; }
            html[data-theme="dark"] { background-color: #0A0A0A; }
        </style>

        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png?v=2">
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=2">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2">
        <link rel="shortcut icon" href="/favicon-32.png?v=2">

        {{-- PWA Meta Tags --}}
        <meta name="theme-color" content="#0A0A0A">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="PIMS">

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
