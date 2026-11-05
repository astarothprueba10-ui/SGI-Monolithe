import { expect, type Locator, type Page } from '@playwright/test';

/** Verifica que solo los contenedores locales puedan desplazarse horizontalmente. */
export async function assertPageWidth(page: Page) {
  const sizes = await page.evaluate(() => ({ width: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    mains: Array.from(document.querySelectorAll('main')).map(e => ({ client: e.clientWidth, scroll: e.scrollWidth }))
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.width + 2);
  for (const main of sizes.mains) expect(main.scroll).toBeLessThanOrEqual(main.client + 2);
}

/** Comprueba el área visible, el foco y las acciones de un diálogo abierto. */
export async function assertDialog(page: Page, name: string | RegExp) {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => {
    const rect = await dialog.locator('.dialog-panel').boundingBox();
    const size = page.viewportSize()!;
    return Boolean(rect && rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= size.width + 1 && rect.y + rect.height <= size.height + 1);
  }).toBe(true);
  for (const button of await dialog.locator('.dialog-actions button').all()) await expect(button).toBeInViewport({ ratio: 0.95 });
  expect(await dialog.evaluate(d => d.scrollWidth <= d.clientWidth + 2 && d.contains(document.activeElement))).toBe(true);
  return dialog;
}

/** Espera el cierre y la restauración del desplazamiento, incluidos los diálogos anidados. */
export async function assertClosed(page: Page, dialog: Locator, parentOpen = false) {
  await expect(dialog).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => [document.body.style.overflow, document.documentElement.style.overflow])).toEqual(parentOpen ? ['hidden', 'hidden'] : ['', '']);
}
