import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, NRP } from './helpers';

const PAGES = [
    '/dashboard',
    '/monitoring-p2h',
    '/p2h-compliance',
    '/p2h',
    '/p2h/approvals',
    '/p2h/findings',
    '/notifications',
    '/p2h/daily-summary',
    '/p2h/period-report',
    '/monitoring',
    '/downtime',
    '/units',
    '/sites',
    '/users',
    '/audit-log',
    '/app-settings',
    '/settings/profile',
];

for (const theme of ['light', 'dark']) {
    test('axe tanpa pelanggaran serius, tema ' + theme, async ({ page }) => {
        test.setTimeout(240_000);
        await page.addInitScript((value) => {
            localStorage.setItem('pims.theme', value);
        }, theme);
        await page.setViewportSize({ width: 1440, height: 900 });

        const check = async (path: string) => {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            const { violations } = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();

            return violations
                .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
                .map((v) => ({
                    path,
                    rule: v.id,
                    count: v.nodes.length,
                    sample: v.nodes[0]?.html.slice(0, 120),
                    detail: v.nodes[0]?.any[0]?.message?.slice(0, 120),
                }));
        };

        const found = [...(await check('/login'))];

        await login(page, NRP.admin);

        for (const path of PAGES) {
            found.push(...(await check(path)));
        }

        console.log(JSON.stringify(found, null, 1));
        expect(found).toEqual([]);
    });
}

test('tidak ada scroll horizontal halaman di lebar 390', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, NRP.admin);

    const overflowing: string[] = [];

    for (const path of PAGES) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const wide = await page.evaluate(
            () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
        );

        if (wide) {
            overflowing.push(path);
        }
    }

    expect(overflowing).toEqual([]);
});
