import type { Locator, Page } from '@playwright/test';

export const NRP = {
    admin: '19850704',
    manager: '19870312',
    /** Slamet Riyadi: BUS-11 belum P2H pada data demo. */
    driver: '20180715',
};

export async function login(page: Page, nrp: string) {
    await page.goto('/login');
    await page.locator('#nik').fill(nrp);
    await page.locator('#password').fill('password');
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

export async function sign(page: Page, canvas: Locator) {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();

    if (!box) {
        throw new Error('Kanvas tanda tangan tidak terlihat');
    }

    const y = box.y + box.height / 2;

    await page.mouse.move(box.x + 30, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 90, y - 25, { steps: 6 });
    await page.mouse.move(box.x + 150, y + 25, { steps: 6 });
    await page.mouse.move(box.x + 220, y - 10, { steps: 6 });
    await page.mouse.up();
}
