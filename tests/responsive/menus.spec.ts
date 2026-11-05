import { expect, test, type Page } from '@playwright/test';
import { origins, prepareContext } from './fixtures';
import { assertClosed } from './assertions';

const menus = [
  { app: 'backoffice', path: '/trabajadores', trigger: 'Abrir menú de navegación', label: 'Menú de navegación', to: '/proyectos', desktop: 768 },
  { app: 'pagina-web', path: '/', trigger: 'Abrir menú', label: 'Navegación principal', to: '/contacto', desktop: 1024 },
  { app: 'pagina-web', path: '/cms', trigger: 'Abrir menú', label: 'Navegación del CMS', to: '/cms/proyectos', desktop: 1024 },
  { app: 'portal-cliente', path: '/portal', trigger: 'Abrir navegación', label: 'Navegación del portal', to: '/portal/documentos', desktop: 1024 }
] as const;

async function exerciseMenu(page: Page, menu: typeof menus[number]) {
  const trigger = page.getByRole('button', { name: menu.trigger, exact: true });
  const dialog = page.getByRole('dialog', { name: menu.label, exact: true });
  await trigger.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(d => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
  await expect(trigger).toBeFocused();
  await trigger.click(); await dialog.locator(`a[href="${menu.to}"]`).first().click();
  await assertClosed(page, dialog); expect(new URL(page.url()).pathname).toBe(menu.to);
  await trigger.click(); const size = page.viewportSize()!;
  await page.setViewportSize({ width: 1100, height: size.height });
  await assertClosed(page, dialog); await page.setViewportSize(size);
  await trigger.click();
  await page.mouse.click(menu.label === 'Navegación principal' ? 4 : size.width - 4, size.height / 2);
  await assertClosed(page, dialog);
}

for (const menu of menus) {
  test(`${menu.label}: navegación, foco, cierre y cambio de orientación`, async ({ context, page }) => {
    test.skip(page.viewportSize()!.width >= menu.desktop, 'La navegación de escritorio ya está visible.');
    await prepareContext(context, menu.app);
    await page.goto(origins[menu.app] + menu.path);
    await exerciseMenu(page, menu);
  });
}
