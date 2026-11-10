import { expect, test, type Page, type Route } from '@playwright/test';
import { assertDialog, assertPageWidth } from './assertions';
import { origins, prepareContext } from './fixtures';

type Document = { tipoDocumento: string; numeroDocumento: string };
function found(document: Document) {
  const second = document.numeroDocumento.endsWith('2');
  return { ...document, estado: 'ENCONTRADO', fuente: document.tipoDocumento === 'DNI' ? 'DNI' : 'MONOLITHE',
    persona: { nombres: second ? 'Andrea' : 'Lucía María', apellidoPaterno: second ? 'Segunda' : 'Prueba', apellidoMaterno: 'Ejemplo' },
    mensaje: 'Datos encontrados. Revisa los nombres antes de registrar el lead.' };
}

function crmFixture(path: string) {
  if (path.endsWith('/catalogos')) return { estados: [], origenes: [{ codigo: 'WEB', nombre: 'Página web' }],
    tiposSeguimiento: [], proyectos: [{ id: 1, codigo: 'PROJ-001', nombre: 'Proyecto de prueba' }], turnosVisita: [], zonaHorariaVisitas: 'America/Lima' };
  if (path.endsWith('/asesores')) return [];
  if (path.includes('/resumen')) return { total: 0, leads: 0, potenciales: 0, compradores: 0, cerrados: 0, sinAsesor: 0 };
  return { items: [], total: 0, pagina: 1, tamano: 15, paginas: 0 };
}

async function prepare(page: Page, lookup?: (document: Document, route: Route) => Promise<void>) {
  await prepareContext(page.context(), 'backoffice');
  const calls: Document[] = []; const writes: Record<string, unknown>[] = [];
  await page.context().route('**/api/core/crm/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/personas/consultar')) {
      const body = route.request().postDataJSON(); calls.push(body);
      return lookup ? lookup(body, route) : route.fulfill({ json: found(body) });
    }
    if (path.endsWith('/prospectos') && route.request().method() === 'POST') writes.push(route.request().postDataJSON());
    return route.fulfill({ json: crmFixture(path) });
  });
  await page.goto(`${origins.backoffice}/crm`);
  await page.getByRole('button', { name: 'Nuevo lead', exact: true }).click();
  return { dialog: await assertDialog(page, 'Registrar nuevo lead'), calls, writes };
}

function deferred() {
  let release!: () => void; let delivered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const done = new Promise<void>(resolve => { delivered = resolve; });
  const send = async (document: Document, route: Route) => {
    await gate; await route.fulfill({ json: found(document) }); delivered();
  };
  return { release, done, send };
}

test('el documento aparece primero y el DNI completo carga sus datos automáticamente', async ({ page }) => {
  const { dialog, calls } = await prepare(page);
  expect(await dialog.locator('input,select').evaluateAll(elements => elements.slice(0, 2).map(e => e.id)))
    .toEqual(['lead-tipo-documento', 'lead-numero-documento']);
  await page.locator('#lead-numero-documento').fill('0000000');
  expect(calls).toHaveLength(0);
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(page.locator('#lead-nombres')).toHaveValue('Lucía María');
  await expect(page.locator('#lead-apellido-paterno')).toHaveValue('Prueba');
  await expect(page.locator('#lead-apellido-materno')).toHaveValue('Ejemplo');
  expect(calls).toEqual([{ tipoDocumento: 'DNI', numeroDocumento: '00000001' }]);
  await assertPageWidth(page);
  if ([390, 1365].includes(page.viewportSize()!.width)) await page.screenshot({ path: `/workspace/scratch/22d114e806c9/crm-lead-${page.viewportSize()!.width}.png` });
});

test('conserva los datos escritos mientras la consulta sigue pendiente', async ({ page }) => {
  const pending = deferred(); const { dialog, calls } = await prepare(page, pending.send);
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect.poll(() => calls.length).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Registrar lead', exact: true })).toBeDisabled();
  await page.locator('#lead-nombres').fill('Nombre manual');
  pending.release(); await pending.done;
  await expect(page.locator('#lead-apellido-paterno')).toHaveValue('Prueba');
  await expect(page.locator('#lead-nombres')).toHaveValue('Nombre manual');
});

test('cambiar el documento retira los datos anteriores y conserva correcciones manuales', async ({ page }) => {
  await prepare(page);
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(page.locator('#lead-apellido-paterno')).toHaveValue('Prueba');
  await page.locator('#lead-nombres').fill('Nombre corregido');
  await page.locator('#lead-numero-documento').fill('00000002');
  await expect(page.locator('#lead-apellido-paterno')).toHaveValue('Segunda');
  await expect(page.locator('#lead-nombres')).toHaveValue('Nombre corregido');
});

test('una respuesta antigua no sustituye los datos del documento nuevo', async ({ page }) => {
  const pending = deferred();
  const { calls } = await prepare(page, (document, route) => document.numeroDocumento.endsWith('1')
    ? pending.send(document, route) : route.fulfill({ json: found(document) }));
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect.poll(() => calls.length).toBe(1);
  await page.locator('#lead-numero-documento').fill('00000002');
  await expect(page.locator('#lead-nombres')).toHaveValue('Andrea');
  pending.release(); await pending.done;
  await expect(page.locator('#lead-nombres')).toHaveValue('Andrea');
  await expect(page.locator('#lead-apellido-paterno')).toHaveValue('Segunda');
});

test('un carné de extranjería permite recuperar los datos registrados localmente', async ({ page }) => {
  const { calls } = await prepare(page);
  await page.locator('#lead-tipo-documento').selectOption('CE');
  await page.locator('#lead-numero-documento').fill('000000001');
  await expect(page.locator('#lead-nombres')).toHaveValue('Lucía María');
  expect(calls).toEqual([{ tipoDocumento: 'CE', numeroDocumento: '000000001' }]);
});

test('la API no disponible conserva el registro manual', async ({ page }) => {
  const { dialog } = await prepare(page, async (document, route) => route.fulfill({ json: {
    ...document, estado: 'NO_DISPONIBLE', fuente: null, persona: null,
    mensaje: 'La consulta de identidad no está disponible. Puedes completar los datos manualmente.' } }));
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(dialog.getByRole('status')).toContainText('manualmente');
  await expect(dialog.getByRole('button', { name: 'Registrar lead', exact: true })).toBeEnabled();
  await page.locator('#lead-nombres').fill('Nombre manual');
  await expect(page.locator('#lead-nombres')).toHaveValue('Nombre manual');
});

test('guarda los nombres recuperados con el mismo documento y los datos de contacto manuales', async ({ page }) => {
  const { dialog, writes } = await prepare(page);
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(page.locator('#lead-nombres')).toHaveValue('Lucía María');
  await page.locator('#lead-phone-number').fill('987654321');
  await page.getByPlaceholder('persona@example.com', { exact: true }).fill('prueba@example.com');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toEqual([expect.objectContaining({ tipoDocumento: 'DNI', numeroDocumento: '00000001',
    nombres: 'Lucía María', apellidoPaterno: 'Prueba', apellidoMaterno: 'Ejemplo', telefono: '987654321', correo: 'prueba@example.com' })]);
});

test('cerrar y reabrir el formulario descarta una consulta pendiente', async ({ page }) => {
  const pending = deferred(); const { dialog, calls } = await prepare(page, pending.send);
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect.poll(() => calls.length).toBe(1);
  await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo lead', exact: true }).click();
  pending.release(); await pending.done;
  await expect(page.locator('#lead-numero-documento')).toHaveValue('');
  await expect(page.locator('#lead-nombres')).toHaveValue('');
});

test('un fallo de red libera el formulario para completar los datos manualmente', async ({ page }) => {
  const { dialog } = await prepare(page, async (_document, route) => route.abort('failed'));
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(dialog.getByRole('status')).toContainText('No se pudo consultar');
  await expect(dialog.getByRole('button', { name: 'Registrar lead', exact: true })).toBeEnabled();
});

test('una respuesta con otro documento no carga datos ni deja el formulario bloqueado', async ({ page }) => {
  const { dialog } = await prepare(page, async (document, route) =>
    route.fulfill({ json: found({ ...document, numeroDocumento: '00000002' }) }));
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(dialog.getByRole('status')).toContainText('No se pudo consultar');
  await expect(page.locator('#lead-nombres')).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Registrar lead', exact: true })).toBeEnabled();
});
