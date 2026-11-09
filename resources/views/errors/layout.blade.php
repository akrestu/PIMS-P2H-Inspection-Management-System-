<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('code') · PIMS</title>
    <script>
        (function () {
            var theme = 'system';
            try { theme = localStorage.getItem('pims.theme') || 'system'; } catch (e) {}
            if (theme !== 'light' && theme !== 'dark') {
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            document.documentElement.dataset.theme = theme;
        })();
    </script>
    {{-- Tanpa aset build agar halaman tetap tampil saat aplikasi bermasalah --}}
    <style>
        :root { --bg: #F7F6F2; --card: #FFFFFF; --fg: #141414; --muted: #5F5A51; --btn: #141414; --btn-fg: #FFFFFF; }
        [data-theme="dark"] { --bg: #0F0F0E; --card: #181816; --fg: #F5F3EE; --muted: #A8A397; --btn: #F5F3EE; --btn-fg: #141414; }
        body { margin: 0; min-height: 100svh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; background: var(--bg); color: var(--fg); font-family: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif; }
        main { width: 100%; max-width: 480px; box-sizing: border-box; padding: 32px; border-radius: 20px; background: var(--card); box-shadow: 0 1px 2px rgba(20, 20, 20, .04); }
        .code { margin: 0; font: 500 13px "JetBrains Mono", ui-monospace, monospace; color: var(--muted); }
        h1 { margin: 12px 0 8px; font-size: 24px; font-weight: 800; letter-spacing: -.02em; }
        p.text { margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: var(--muted); }
        a { display: inline-flex; align-items: center; min-height: 48px; padding: 0 20px; border-radius: 999px; background: var(--btn); color: var(--btn-fg); font-weight: 600; font-size: 15px; text-decoration: none; }
        a:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; box-shadow: 0 0 0 5px #F4D03F; }
    </style>
</head>
<body>
    <main>
        <p class="code">@yield('code') · @yield('label')</p>
        <h1>@yield('title')</h1>
        <p class="text">@yield('message')</p>
        <a href="/">Kembali ke beranda</a>
    </main>
</body>
</html>
