/** Registrasi service worker (public/sw.js) — hanya build produksi. */
export function registerServiceWorker(): void {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then(() => navigator.serviceWorker.ready)
            // Simpan shell aplikasi agar Form P2H tetap terbuka saat offline
            .then((reg) => reg.active?.postMessage({ type: 'precache' }))
            .catch(() => {
                // SW gagal terpasang (mis. HTTP non-aman) — aplikasi tetap jalan online
            });
    });
}

/** Keluar akun: hapus cache halaman ber-data pribadi (HP dipakai bergantian). */
export function clearPageCache(): void {
    navigator.serviceWorker?.controller?.postMessage({ type: 'clear-pages' });
}
