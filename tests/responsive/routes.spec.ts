import { test, expect } from '@playwright/test';
import { origins, prepareContext, routes } from './fixtures';
import { assertPageWidth } from './assertions';

for (const app of Object.keys(routes) as (keyof typeof routes)[]) {
  test(`${app}: todas las rutas caben en la pantalla`, async ({ context, page }) => {
    await prepareContext(context, app);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const pathname of routes[app]) {
      await test.step(pathname, async () => {
        await page.goto(origins[app] + pathname);
        await page.waitForTimeout(180);
        await assertPageWidth(page);
      });
    }
    expect(errors).toEqual([]);
  });
}
