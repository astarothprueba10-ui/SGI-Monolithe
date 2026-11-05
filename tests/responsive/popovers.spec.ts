import { expect, test, type Page } from '@playwright/test';
import { origins, prepareContext } from './fixtures';

async function assertPopover(page: Page, selector: string) {
  await expect.poll(async () => {
    const box = await page.locator(selector).boundingBox(); const size = page.viewportSize()!;
    return Boolean(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1);
  }).toBe(true);
}

for (const app of ['backoffice', 'portal-cliente'] as const) {
  test(`${app}: notificaciones y perfil dentro de la pantalla`, async ({ context, page }) => {
    await prepareContext(context, app); await page.goto(origins[app] + (app === 'backoffice' ? '/' : '/portal'));
    const selector = app === 'backoffice' ? '.header-popover' : '.portal-header-popover';
    await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
    await assertPopover(page, selector); await page.keyboard.press('Escape');
    await expect(page.locator(selector)).not.toBeVisible();
    if (app === 'portal-cliente') {
      await page.getByRole('button', { name: 'Menú de perfil', exact: true }).click();
      await assertPopover(page, selector); await page.keyboard.press('Escape');
      await expect(page.locator(selector)).not.toBeVisible();
    }
  });
}
