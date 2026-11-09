import { defineConfig } from '@playwright/test';

/**
 * E2E alur kritis. Butuh server terpisah di database demo:
 *   DB_DATABASE=pims_visual php artisan serve --port=8001
 * globalSetup mengisi ulang database itu dan menolak database lain.
 */
export default defineConfig({
    testDir: './tests/e2e',
    globalSetup: './tests/e2e/global-setup.ts',
    workers: 1,
    timeout: 90_000,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:8001',
        channel: 'chrome',
        trace: 'retain-on-failure',
    },
});
