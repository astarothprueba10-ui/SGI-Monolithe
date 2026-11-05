import { test, expect } from '@playwright/test';
import { origins, prepareContext } from './fixtures';
import { assertClosed, assertDialog, assertPageWidth } from './assertions';

test('Backoffice: crear trabajador con formulario largo y aviso visible', async ({ context, page }) => {
  await prepareContext(context, 'backoffice'); await page.goto(origins.backoffice + '/trabajadores');
  await page.getByRole('button', { name: 'Nuevo trabajador', exact: true }).click();
  const dialog = await assertDialog(page, 'Nuevo trabajador');
  await dialog.locator('input[type=tel]').fill('987654321');
  await expect(dialog.locator('input[type=tel]')).toHaveValue('987654321');
  await dialog.locator('textarea').last().scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    const source = await fetch('/src/components/ui/ToastHost.tsx').then(response => response.text());
    const url = source.match(/from ["']([^"']*sonner[^"']+)["']/)![1];
    const { toast } = await import(/* @vite-ignore */ url); toast.error('Aviso de prueba móvil');
  });
  await expect(dialog.locator('[data-sonner-toast]')).toContainText('Aviso de prueba móvil');
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
  await expect(page.locator('body > div [data-sonner-toast]')).toContainText('Aviso de prueba móvil');
});

test('Backoffice: editar y descartar sin bloquear la página', async ({ context, page }) => {
  await prepareContext(context, 'backoffice'); await page.goto(origins.backoffice + '/trabajadores');
  await page.getByRole('button', { name: /^Editar Persona/ }).click();
  const dialog = await assertDialog(page, 'Editar trabajador');
  await dialog.locator('#editTelefono').fill('987654322');
  await page.setViewportSize({ width: 390, height: 360 });
  await assertDialog(page, 'Editar trabajador');
  await page.setViewportSize({ width: 320, height: 820 });
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const confirm = await assertDialog(page, 'Descartar cambios sin guardar');
  await page.keyboard.press('Escape'); await assertClosed(page, confirm, true);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('dialog', { name: 'Descartar cambios sin guardar' }).getByRole('button', { name: 'Cerrar sin guardar' }).click();
  await assertClosed(page, dialog); await expect(page.locator('dialog[open]')).toHaveCount(0);
});

const forms = [
  ['/proyectos', 'Nuevo proyecto', 'Nuevo proyecto'], ['/usuarios', 'Nuevo usuario', 'Nuevo usuario'],
  ['/ventas', 'Nueva operación', 'Registrar Separación de Lote'], ['/crm', 'Nuevo lead', 'Registrar nuevo lead']
];
for (const [pathname, trigger, title] of forms) {
  test(`Backoffice: ${title}`, async ({ context, page }) => {
    await prepareContext(context, 'backoffice'); await page.goto(origins.backoffice + pathname);
    await page.getByRole('button', { name: trigger, exact: true }).click();
    const dialog = await assertDialog(page, title);
    await page.keyboard.press('Escape'); await assertClosed(page, dialog);
  });
}

test('CMS: editar contenido de un proyecto en vertical y horizontal', async ({ context, page }) => {
  await prepareContext(context, 'pagina-web'); await page.goto(origins['pagina-web'] + '/cms/proyectos');
  await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  const dialog = await assertDialog(page, 'Nuevo proyecto');
  await dialog.getByLabel('Beneficios incluidos').fill('Agua, luz, parques y jardines');
  await page.setViewportSize({ width: 667, height: 320 }); await assertDialog(page, 'Nuevo proyecto');
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
});

test('CMS: confirmar publicación', async ({ context, page }) => {
  await prepareContext(context, 'pagina-web'); await page.goto(origins['pagina-web'] + '/cms/publicaciones');
  await page.getByRole('button', { name: 'Publicar', exact: true }).first().click();
  const dialog = await assertDialog(page, 'Confirmar publicación');
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
});

test('Portal: detalle de cuota en vertical y horizontal', async ({ context, page }) => {
  await prepareContext(context, 'portal-cliente'); await page.goto(origins['portal-cliente'] + '/portal/cronograma');
  await page.getByRole('button', { name: 'Ver detalle', exact: true }).filter({ visible: true }).first().click();
  const dialog = await assertDialog(page, /Detalle de la cuota/);
  await page.setViewportSize({ width: 667, height: 320 }); await assertDialog(page, /Detalle de la cuota/);
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
});

test('Portal: confirmar solicitud de soporte', async ({ context, page }) => {
  await prepareContext(context, 'portal-cliente'); await page.goto(origins['portal-cliente'] + '/portal/soporte');
  await page.getByPlaceholder('Ej. No puedo registrar el voucher de mi cuota').fill('Consulta sobre mis pagos');
  await page.getByPlaceholder('Cuéntanos qué ocurrió, con fechas y montos si aplica.').fill('Necesito información adicional sobre la fecha de vencimiento de mi próxima cuota.');
  await page.getByRole('button', { name: 'Enviar solicitud', exact: true }).click();
  const dialog = await assertDialog(page, '¿Enviar tu solicitud a soporte?');
  await page.keyboard.press('Escape'); await assertClosed(page, dialog);
});

test('CMS: biblioteca de imágenes con panel adaptable', async ({ context, page }) => {
  await prepareContext(context, 'pagina-web'); await page.goto(origins['pagina-web'] + '/cms/contenido/inicio');
  await assertPageWidth(page);
  await page.getByRole('button', { name: 'Cambiar imagen', exact: true }).click();
  const dialog = await assertDialog(page, 'Seleccionar imagen');
  await dialog.locator('ul button').first().click();
  await assertClosed(page, dialog); await assertPageWidth(page);
});
