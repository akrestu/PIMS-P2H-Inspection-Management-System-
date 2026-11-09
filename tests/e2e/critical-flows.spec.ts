import { expect, test } from '@playwright/test';
import { login, NRP, sign } from './helpers';

test.describe.configure({ mode: 'serial' });

test('login salah menampilkan pesan di form', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#nik').fill(NRP.driver);
    await page.locator('#password').fill('sandi-salah');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/login/);
});

test('driver mengisi dan mengirim P2H di mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, NRP.driver);
    await page.goto('/p2h/form');

    await page.getByRole('radio', { name: /BUS-11/ }).click();
    const next = page.getByRole('button', { name: 'Lanjut' });

    await page.waitForLoadState('networkidle');
    await next.click();
    await expect(page.getByText('Langkah 2 dari 4')).toBeVisible();

    for (const radio of await page
        .getByRole('radio', { name: 'Layak', exact: true })
        .all()) {
        await radio.click();
    }

    await next.click();
    await expect(page.getByText('Langkah 3 dari 4')).toBeVisible();
    await next.click();
    await expect(page.getByText('Langkah 4 dari 4')).toBeVisible();

    await page.getByText('Unit siap beroperasi').click();
    await sign(page, page.locator('canvas').first());
    await page.getByRole('button', { name: 'Kirim P2H' }).click();

    await page.waitForURL(/terkirim/);
    await expect(
        page
            .locator('main')
            .getByText(/terkirim/i)
            .first(),
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/sukses-p2h.png' });
});

test('manager menyetujui P2H di desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, NRP.manager);
    await page.goto('/p2h/approvals');

    const entry = page
        .locator('button:visible', { hasText: /LV-[0-9]+/ })
        .first();

    await expect(entry).toBeVisible();
    const code = (await entry.innerText()).match(/LV-[0-9]+/)?.[0] ?? '';
    await entry.click();
    await sign(page, page.locator('canvas:visible').first());
    await page.getByRole('button', { name: /Setujui P2H/ }).click();

    await expect(page.locator('button:visible', { hasText: code })).toHaveCount(
        0,
    );
});
