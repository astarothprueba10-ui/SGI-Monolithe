import { expect, test, type Page } from '@playwright/test';
import { assertDialog, assertPageWidth } from './assertions';
import { origins, prepareContext } from './fixtures';

function crmFixture(path: string) {
  if (path.endsWith('/catalogos')) return { estados: [], origenes: [{ codigo: 'WEB', nombre: 'Página web' }], tiposSeguimiento: [],
    proyectos: [{ id: 1, codigo: 'PROJ-001', nombre: 'Proyecto de prueba' }], turnosVisita: [], zonaHorariaVisitas: 'America/Lima' };
  if (path.endsWith('/asesores')) return [];
  if (path.includes('/resumen')) return { total: 0, leads: 0, potenciales: 0, compradores: 0, cerrados: 0, sinAsesor: 0 };
  return { items: [], total: 0, pagina: 1, tamano: 15, paginas: 0 };
}

async function prepare(page: Page) {
  await prepareContext(page.context(), 'backoffice');
  const writes: Record<string, unknown>[] = [];
  await page.context().route('**/api/core/crm/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/personas/consultar')) return route.fulfill({ json: { ...route.request().postDataJSON(), estado: 'ENCONTRADO',
      fuente: 'MONOLITHE', persona: { nombres: 'Lucía', apellidoPaterno: 'Prueba', apellidoMaterno: 'Ejemplo' }, mensaje: 'Datos encontrados.' } });
    if (path.endsWith('/prospectos') && route.request().method() === 'POST') writes.push(route.request().postDataJSON());
    return route.fulfill({ json: crmFixture(path) });
  });
  await page.goto(`${origins.backoffice}/crm`);
  await page.getByRole('button', { name: 'Nuevo lead', exact: true }).click();
  return { dialog: await assertDialog(page, 'Registrar nuevo lead'), writes };
}

async function choose(page: Page, query: string, country: string) {
  await page.getByRole('button', { name: 'País y código telefónico', exact: true }).click();
  await page.getByRole('combobox', { name: 'Buscar país o código', exact: true }).fill(query);
  await page.getByRole('option', { name: new RegExp(`\\(${country}\\)`) }).click();
}

async function complete(page: Page) {
  await page.locator('#lead-numero-documento').fill('00000001');
  await expect(page.locator('#lead-nombres')).toHaveValue('Lucía');
  await page.getByPlaceholder('persona@example.com', { exact: true }).fill('prueba@example.com');
}

async function paste(page: Page, text: string) {
  await page.locator('#lead-phone-number').evaluate((element, value) => {
    const data = new DataTransfer(); data.setData('text', value);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
}

test('abre con Perú y limita la escritura a nueve dígitos', async ({ page }) => {
  await prepare(page);
  await expect(page.getByRole('button', { name: 'País y código telefónico' })).toContainText('Perú (+51)');
  await expect(page.locator('#lead-phone-number')).toHaveAttribute('maxlength', '9');
  await page.locator('#lead-phone-number').pressSequentially('abc9876543210');
  await expect(page.locator('#lead-phone-number')).toHaveValue('987654321');
  await choose(page, 'Peru', 'PE');
  await expect(page.locator('#lead-phone-number')).toHaveValue('987654321');
  await expect(page.locator('#lead-phone-hint')).toContainText('comenzar por 9');
  await assertPageWidth(page);
  if ([390,1365].includes(page.viewportSize()!.width)) await page.screenshot({ path: `/workspace/scratch/22d114e806c9/lead-phone-${page.viewportSize()!.width}.png` });
});

test('rechaza el prefijo peruano incorrecto y guarda al corregirlo', async ({ page }) => {
  const { dialog, writes } = await prepare(page); await complete(page);
  await page.locator('#lead-phone-number').fill('812345678');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(page.locator('#lead-error-phone')).toContainText('comenzar por 9');
  expect(writes).toHaveLength(0);
  await page.locator('#lead-phone-number').fill('987654321');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes[0].telefono).toBe('987654321');
});

test('busca por prefijo y valida los diez dígitos de Colombia', async ({ page }) => {
  const { dialog, writes } = await prepare(page); await complete(page);
  await choose(page, '+57', 'CO');
  await expect(page.locator('#lead-phone-number')).toHaveAttribute('maxlength', '10');
  await page.locator('#lead-phone-number').fill('321123456');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(page.locator('#lead-error-phone')).toContainText('10 dígitos');
  expect(writes).toHaveLength(0);
  await page.locator('#lead-phone-number').fill('3211234567');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes[0].telefono).toBe('+573211234567');
});

test('busca nombres sin tildes y adapta el límite al país elegido', async ({ page }) => {
  await prepare(page);
  await page.locator('#lead-phone-number').fill('987654321');
  await choose(page, 'Mexico', 'MX');
  await expect(page.locator('#lead-phone-number')).toHaveValue('');
  await expect(page.locator('#lead-phone-number')).toHaveAttribute('maxlength', '10');
  await choose(page, 'Alemania', 'DE');
  await expect(page.locator('#lead-phone-number')).toHaveAttribute('maxlength', '11');
  await expect(page.locator('#lead-phone-hint')).toContainText('10 o 11 dígitos');
  await assertPageWidth(page);
});

test('rechaza el pegado excesivo sin truncar ni guardar el teléfono anterior', async ({ page }) => {
  const { dialog, writes } = await prepare(page); await complete(page);
  await page.locator('#lead-phone-number').fill('987654321');
  await paste(page, '987654321000');
  await expect(page.locator('#lead-phone-paste-error')).toContainText('longitud');
  await expect(page.locator('#lead-phone-number')).toHaveValue('987654321');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click(); expect(writes).toHaveLength(0);
  await page.locator('#lead-phone-number').fill(''); await paste(page, '+51 987 654 321');
  await expect(page.locator('#lead-phone-number')).toHaveValue('987654321');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes[0].telefono).toBe('987654321');
});

test('el pegado de otro país exige seleccionar su prefijo antes de guardar', async ({ page }) => {
  const { dialog, writes } = await prepare(page); await complete(page);
  await paste(page, '+34 612 345 678');
  await expect(page.locator('#lead-phone-paste-error')).toContainText('país seleccionado');
  await choose(page, '+34', 'ES'); await paste(page, '+34 612 345 678');
  await expect(page.locator('#lead-phone-number')).toHaveValue('612345678');
  await dialog.getByRole('button', { name: 'Registrar lead', exact: true }).click();
  await expect(dialog).not.toBeVisible(); expect(writes[0].telefono).toBe('+34612345678');
});

test('permite navegar con teclado sin cerrar el formulario al pulsar Escape', async ({ page }) => {
  const { dialog } = await prepare(page);
  await page.getByRole('button', { name: 'País y código telefónico' }).click();
  const search = page.getByRole('combobox', { name: 'Buscar país o código' });
  await search.fill('sin coincidencias'); await search.press('Enter');
  await expect(dialog).toBeVisible();
  await search.press('Escape'); await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'País y código telefónico' }).click();
  await search.fill('+593'); await search.press('ArrowDown'); await search.press('Enter');
  await expect(page.getByRole('button', { name: 'País y código telefónico' })).toContainText('Ecuador (+593)');
  await page.keyboard.press('Tab'); await expect(page.locator('#lead-phone-number')).toBeFocused();
});

test('al reabrir vuelve a Perú y no conserva el teléfono del registro anterior', async ({ page }) => {
  const { dialog } = await prepare(page);
  await choose(page, 'Estados Unidos', 'US');
  await page.locator('#lead-phone-number').fill('2015550123');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo lead', exact: true }).click();
  await expect(page.getByRole('button', { name: 'País y código telefónico' })).toContainText('Perú (+51)');
  await expect(page.locator('#lead-phone-number')).toHaveValue('');
});
