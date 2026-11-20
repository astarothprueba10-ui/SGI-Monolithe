import { expect, test } from '@playwright/test';
import { assertPageWidth } from './assertions';
import { origins, prepareContext } from './fixtures';
import { deferredWorker, fillWorkerDetails, prepareWorker, workerFound } from './workerIdentity.fixtures';

test('RRHH consulta un DNI completo y presenta nombres con tildes e iniciales mayúsculas', async ({ page }) => {
  const { calls, dialog } = await prepareWorker(page);
  await expect(page.locator('#idTipoDocumento option')).toHaveText(['Seleccionar tipo', 'DNI', 'Carné de extranjería']);
  await page.locator('#numeroDocumento').fill('0000000');
  await page.waitForTimeout(650); expect(calls).toHaveLength(0);
  await page.locator('#numeroDocumento').fill('00000001');
  await expect(page.locator('#nombres')).toHaveValue('Lucía María');
  await expect(page.locator('#apellidoPaterno')).toHaveValue('Muñoz');
  await expect(page.locator('#apellidoMaterno')).toHaveValue('De La Cruz');
  expect(calls).toEqual([{ idTipoDocumento: 1, numeroDocumento: '00000001' }]);
  await expect(page.locator('#correoElectronico')).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Confirmar esta persona' })).toHaveCount(0);
  await assertPageWidth(page);
  if ([390, 1365].includes(page.viewportSize()!.width)) await dialog.screenshot({ path: `/workspace/scratch/22d114e806c9/worker-dni-${page.viewportSize()!.width}.png` });
});

test('el registro externo guarda nombres normalizados sin inventar idPersona', async ({ page }) => {
  const { dialog, writes } = await prepareWorker(page);
  await page.locator('#numeroDocumento').fill('00000001');
  await expect(page.locator('#nombres')).toHaveValue('Lucía María');
  await page.locator('#nombres').fill('cÉsAr jAVIER');
  await page.locator('#apellidoPaterno').fill('ROJAS');
  await page.locator('#apellidoMaterno').fill('yaipen');
  await fillWorkerDetails(page);
  await dialog.getByRole('button', { name: 'Guardar trabajador', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes).toHaveLength(1);
  expect(writes[0].informacionPersonal).toEqual(expect.objectContaining({ nombres: 'César Javier', apellidoPaterno: 'Rojas',
    apellidoMaterno: 'Yaipen', numeroDocumento: '00000001', telefono: '987654321', correoElectronico: 'persona@institucion.example' }));
  expect(writes[0].informacionPersonal).not.toHaveProperty('idPersona');
});

test('las correcciones manuales sobreviven a la respuesta pendiente y al cambio de documento', async ({ page }) => {
  const pending = deferredWorker(); const { dialog, calls } = await prepareWorker(page, pending.send);
  await page.locator('#numeroDocumento').fill('00000001'); await expect.poll(() => calls.length).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Guardar trabajador', exact: true })).toBeDisabled();
  await page.locator('#nombres').fill('Nombre Manual'); pending.release(); await pending.done;
  await expect(page.locator('#apellidoPaterno')).toHaveValue('Muñoz');
  await expect(page.locator('#nombres')).toHaveValue('Nombre Manual');
  await page.locator('#numeroDocumento').fill('0000000');
  await expect(page.locator('#apellidoPaterno')).toHaveValue('');
  await expect(page.locator('#nombres')).toHaveValue('Nombre Manual');
});

test('una respuesta tardía no sustituye los datos del nuevo DNI', async ({ page }) => {
  const pending = deferredWorker();
  const { calls } = await prepareWorker(page, (document, route) => document.numeroDocumento.endsWith('1')
    ? pending.send(document, route) : route.fulfill({ json: workerFound(document) }));
  await page.locator('#numeroDocumento').fill('00000001'); await expect.poll(() => calls.length).toBe(1);
  await page.locator('#numeroDocumento').fill('00000002');
  await expect(page.locator('#nombres')).toHaveValue('Andrea'); pending.release(); await pending.done;
  await expect(page.locator('#nombres')).toHaveValue('Andrea');
});

test('una persona local exige confirmación y conserva su id al registrar', async ({ page }) => {
  const { dialog, writes } = await prepareWorker(page, async (document, route) => route.fulfill({ json: {
    ...workerFound(document), fuente: 'MONOLITHE', personaRegistrada: { idPersona: 81, ...document,
      nombres: 'LUCÍA MARÍA', apellidoPaterno: 'MUÑOZ', apellidoMaterno: 'DE LA CRUZ' } } }));
  await page.locator('#numeroDocumento').fill('00000001');
  await expect(dialog.getByRole('button', { name: 'Guardar trabajador', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Confirmar esta persona', exact: true }).click();
  await expect(page.locator('#nombres')).toHaveValue('Lucía María'); await expect(page.locator('#nombres')).toBeDisabled();
  await fillWorkerDetails(page);
  await dialog.getByRole('button', { name: 'Guardar trabajador', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes[0].informacionPersonal).toEqual(expect.objectContaining({ idPersona: 81, nombres: 'Lucía María' }));
});

test('un proveedor no disponible permite completar manualmente y reintentar', async ({ page }) => {
  const { calls, dialog } = await prepareWorker(page, async (document, route) => route.fulfill({ json: {
    ...document, estado: 'NO_DISPONIBLE', fuente: null, persona: null, personaRegistrada: null,
    mensaje: 'Consulta no disponible. Puedes completar los datos manualmente.' } }));
  await page.locator('#numeroDocumento').fill('00000001');
  await expect(dialog.getByText('Consulta no disponible. Puedes completar los datos manualmente.')).toBeVisible();
  await page.locator('#nombres').fill('mARÍA elENA'); await page.locator('#nombres').blur();
  await expect(page.locator('#nombres')).toHaveValue('María Elena');
  await dialog.getByRole('button', { name: 'Buscar persona', exact: true }).click();
  await expect.poll(() => calls.length).toBe(2);
  await expect(page.locator('#nombres')).toHaveValue('María Elena');
});

test('cerrar y reabrir retira una consulta pendiente', async ({ page }) => {
  const pending = deferredWorker(); const { calls, dialog } = await prepareWorker(page, pending.send);
  await page.locator('#numeroDocumento').fill('00000001'); await expect.poll(() => calls.length).toBe(1);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo trabajador', exact: true }).click(); pending.release(); await pending.done;
  await expect(page.locator('#nombres')).toHaveValue(''); await expect(page.locator('#numeroDocumento')).toHaveValue('');
});

test('un rechazo de identidad conserva el bloqueo de registro', async ({ page }) => {
  const { dialog, writes } = await prepareWorker(page, async (_document, route) => route.fulfill({ status: 400,
    json: { message: 'Identidad inactiva o documento inválido.' } }));
  await page.locator('#numeroDocumento').fill('00000001');
  await expect(dialog.getByText('Identidad inactiva o documento inválido.', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar trabajador', exact: true })).toBeDisabled();
  expect(writes).toHaveLength(0);
});

test('mantiene las validaciones de teléfono y fecha al guardar manualmente', async ({ page }) => {
  const { dialog, writes } = await prepareWorker(page); await page.locator('#numeroDocumento').fill('00000001');
  await expect(page.locator('#nombres')).toHaveValue('Lucía María'); await fillWorkerDetails(page);
  await page.locator('#telefono').fill('987654321555'); await expect(page.locator('#telefono')).toHaveValue('987654321');
  await page.locator('#telefono').fill('812345678'); await expect(page.locator('#telefono')).toHaveAttribute('aria-invalid', 'true');
  await dialog.getByRole('button', { name: 'Guardar trabajador', exact: true }).click(); expect(writes).toHaveLength(0);
  await page.locator('#telefono').fill('98');
  await dialog.getByRole('button', { name: 'Guardar trabajador', exact: true }).click();
  expect(writes).toHaveLength(0); await page.locator('#telefono').fill('987654321');
  await page.locator('#fechaIngreso').fill('2000-01-01');
  await dialog.getByRole('button', { name: 'Guardar trabajador', exact: true }).click(); expect(writes).toHaveLength(0);
});

test('la tabla de usuarios presenta nombres anteriores con iniciales mayúsculas', async ({ page }) => {
  await prepareContext(page.context(), 'backoffice');
  await page.context().route('**/api/security/users', route => route.fulfill({ json: [{ idUsuario: 7, idPersona: 81,
    nombreCompleto: 'césar javier ROJAS yaipen', usuarioLogin: '00000001',
    correo: 'cesar@institucion.example', estado: 'ACTIVO', estadoNombre: 'Activo', roles: [], gestionable: true }] }));
  await page.goto(`${origins.backoffice}/usuarios`);
  await expect(page.getByText('César Javier Rojas Yaipen', { exact: true })).toBeVisible();
  await expect(page.getByText('cesar@institucion.example', { exact: true })).toBeVisible();
  await expect(page.getByText('00000001', { exact: true }).first()).toBeVisible(); await assertPageWidth(page);
});
