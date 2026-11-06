import { expect, test, type Page } from '@playwright/test';
import { assertDialog, assertPageWidth } from './assertions';
import { origins, prepareContext } from './fixtures';

async function prepare(page: Page, now = '2026-11-06T15:00:00Z', create = true) {
  await prepareContext(page.context(), 'backoffice');
  await page.context().route('**/api/core/ubigeos', route => route.fulfill({ json: [
    { codigo: '140101', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo' }
  ] }));
  await page.clock.setFixedTime(new Date(now));
  await page.goto(`${origins.backoffice}/proyectos`);
  await page.getByRole('button', { name: create ? 'Nuevo proyecto' : 'Editar', exact: true }).click();
  const dialog = await assertDialog(page, create ? 'Nuevo proyecto' : 'Editar proyecto');
  await expect(dialog.getByRole('button', { name: create ? 'Crear proyecto' : 'Guardar cambios', exact: true })).toBeEnabled();
  return dialog;
}

async function identify(page: Page, descripcion = 'Proyecto inmobiliario con áreas verdes') {
  await page.locator('#codigo').fill('PROJ-NUEVO');
  await page.locator('#nombre').fill('Proyecto de prueba');
  await page.locator('#codigoEstadoProyecto').selectOption('ACTIVO');
  await page.locator('#descripcion').fill(descripcion);
}

async function fillDate(page: Page, field: 'fechaInicio' | 'fechaFinEstimada', value: string) {
  const input = page.locator(`#${field}`);
  await input.fill(value);
  await expect(input).toHaveValue(value);
}

async function captureWrites(page: Page, firstFailure = false) {
  const writes: Record<string, unknown>[] = [];
  await page.context().route('**/api/core/proyectos', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    writes.push(body);
    if (firstFailure && writes.length === 1) return route.fulfill({ status: 400, json: { message: 'No se pudo guardar el proyecto de prueba.' } });
    await route.fulfill({ json: { ...body, idProyecto: 2, nombreEstadoProyecto: 'Activo' } });
  });
  return writes;
}

test('descripción obligatoria, quince letras reales y guardado correcto', async ({ page }) => {
  const dialog = await prepare(page); const writes = await captureWrites(page);
  await identify(page, '');
  await expect(page.locator('#descripcion')).toHaveAttribute('required', '');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('#descripcion-error')).toContainText('obligatoria');
  await page.locator('#descripcion').fill('abcdefghijklmn 123456');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('#descripcion-error')).toContainText('15 letras');
  expect(writes).toHaveLength(0);
  await page.locator('#descripcion').fill('abcdefghijklmno');
  await expect(page.locator('#descripcion-ayuda')).toContainText('Llevas 15.');
  await fillDate(page, 'fechaInicio', '2026-11-06');
  await fillDate(page, 'fechaFinEstimada', '2026-11-06');
  await assertPageWidth(page);
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toEqual([expect.objectContaining({ descripcion: 'abcdefghijklmno', fechaInicio: '2026-11-06', fechaFinEstimada: '2026-11-06' })]);
});

test('calendarios bloquean pasado y fin anterior al inicio, incluso escrito', async ({ page }) => {
  const dialog = await prepare(page); const writes = await captureWrites(page);
  await identify(page);
  await expect(page.locator('#fechaInicio')).toHaveAttribute('min', '2026-11-06');
  await fillDate(page, 'fechaInicio', '2026-11-05');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('#fechaInicio-error')).toContainText('hoy');
  await fillDate(page, 'fechaInicio', '2026-11-08');
  await expect(page.locator('#fechaFinEstimada')).toHaveAttribute('min', '2026-11-08');
  await fillDate(page, 'fechaFinEstimada', '2026-11-07');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('#fechaFinEstimada-error')).toContainText('anterior');
  expect(writes).toHaveLength(0);
  await fillDate(page, 'fechaFinEstimada', '2026-11-08');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes).toHaveLength(1);
});

test('recalcula hoy al enviar y al enfocar tras la medianoche de Perú', async ({ page }) => {
  const dialog = await prepare(page, '2026-11-07T04:59:59Z'); const writes = await captureWrites(page);
  await identify(page);
  await fillDate(page, 'fechaInicio', '2026-11-06');
  await page.clock.setFixedTime(new Date('2026-11-07T05:00:01Z'));
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(page.locator('#fechaInicio-error')).toContainText('hoy');
  expect(writes).toHaveLength(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#fechaInicio')).toHaveAttribute('min', '2026-11-07');
});

test('edición conserva proyectos con fechas históricas', async ({ page }) => {
  const dialog = await prepare(page, '2026-11-06T15:00:00Z', false);
  await expect(page.locator('#fechaInicio')).toHaveValue('2026-11-04');
  await expect(page.locator('#fechaInicio')).toHaveAttribute('min', '0001-01-01');
  await expect(page.locator('#descripcion')).not.toHaveAttribute('required');
  await assertPageWidth(page);
  await expect(dialog.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeInViewport();
});

test('permite corregir la descripción después de un rechazo del servidor', async ({ page }) => {
  const dialog = await prepare(page); const writes = await captureWrites(page, true);
  await identify(page);
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('No se pudo guardar');
  await expect(dialog.getByRole('button', { name: 'Crear proyecto', exact: true })).toBeEnabled();
  await page.locator('#descripcion').fill('Descripción corregida del proyecto');
  await expect(page.locator('#descripcion')).toHaveValue('Descripción corregida del proyecto');
  await dialog.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toHaveLength(2);
  expect(writes[1].descripcion).toBe('Descripción corregida del proyecto');
});
