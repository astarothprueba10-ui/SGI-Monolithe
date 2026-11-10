import { expect, test } from '@playwright/test';
import { origins, prepareContext } from './fixtures';
import { assertPageWidth } from './assertions';
import { openPortfolio } from './navigationTables.fixtures';

test('la ruta muestra proyecto y pestaña y los enlaces vuelven al módulo', async ({ page }) => {
  await prepareContext(page.context(), 'backoffice'); await page.goto(`${origins.backoffice}/proyectos/1`);
  const trail = page.getByRole('navigation', { name: 'Ruta de navegación' }).filter({ visible: true });
  await expect(trail).toContainText('Proyecto de prueba con un nombre largo');
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Resumen');
  await page.getByRole('tab', { name: 'Etapas', exact: true }).click();
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Etapas');
  await trail.getByRole('link', { name: 'Proyectos y lotes', exact: true }).click();
  await expect(page).toHaveURL(/\/proyectos$/); await expect(trail).not.toContainText('Proyecto de prueba con un nombre largo');
  await assertPageWidth(page);
});

test('la ruta y el teclado siguen la sección seleccionada en otros módulos', async ({ page }) => {
  await prepareContext(page.context(), 'backoffice'); await page.goto(`${origins.backoffice}/trabajadores`);
  const trail = page.getByRole('navigation', { name: 'Ruta de navegación' }).filter({ visible: true });
  await page.getByRole('tab', { name: 'Historial', exact: true }).click();
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Historial');
  await page.getByRole('tab', { name: 'Historial', exact: true }).press('Home');
  await expect(trail.locator('[aria-current="page"]')).toHaveText('Listado de trabajadores');
  await expect(page.getByRole('tab', { name: /^Listado de trabajadores/ })).toBeFocused();
  await assertPageWidth(page);
});

test('la pestaña muestra cuatro leads aunque el resumen del período sea cero', async ({ page }) => {
  await openPortfolio(page);
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('4');
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('tab', { name: /^Clientes potenciales/ })).toContainText('2');
  await expect(page.getByRole('tab', { name: /^Clientes compradores/ })).toContainText('1');
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' }).filter({ visible: true }).locator('[aria-current="page"]')).toHaveText('Leads');
  await assertPageWidth(page);
});

test('los conteos conservan los filtros propios y no heredan el período global', async ({ page }) => {
  const state = await openPortfolio(page);
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('4');
  await page.getByLabel('Filtrar por origen', { exact: true }).selectOption('WHATSAPP');
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('1');
  const requests = state.queries.filter(url => url.pathname.includes('buscar-sin-periodo') && url.searchParams.get('tamano') === '1' && url.searchParams.get('origen') === 'WHATSAPP');
  expect(requests.some(url => url.searchParams.get('categoria') === 'LEAD')).toBeTruthy();
  expect(requests.some(url => url.searchParams.get('categoria') === 'POTENCIAL')).toBeTruthy();
  expect(requests.every(url => !url.searchParams.has('desde'))).toBeTruthy();
});

test('cuenta el total de la cartera y conserva ese total al cambiar de página', async ({ page }) => {
  await openPortfolio(page, { total: 37 });
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('37');
  await expect(page.locator('tbody tr')).toHaveCount(15);
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('37');
  await expect(page.locator('tbody tr').first()).toContainText('LDN-16');
});

test('un fallo en el conteo no muestra cero si existen registros', async ({ page }) => {
  await openPortfolio(page, { failedCounts: true });
  await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('tab', { name: /^Leads/ })).toHaveText('Leads');
});

test('una respuesta anterior no sustituye el listado ni el conteo del filtro nuevo', async ({ page }) => {
  const state = await openPortfolio(page, { slowQuery: 'anterior' });
  const input = page.getByPlaceholder('Buscar por nombre, correo, telefono o codigo...');
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('4'); await input.fill('anterior');
  await expect.poll(() => state.queries.some(url => url.searchParams.get('consulta') === 'anterior')).toBeTruthy();
  await input.fill('vigente'); await expect(page.locator('tbody')).toContainText('vigente');
  await page.waitForTimeout(1100);
  await expect(page.locator('tbody')).not.toContainText('anterior');
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('1');
});

test('la tabla conserva palabras, correos y etiquetas y permite alcanzar las acciones', async ({ page }, testInfo) => {
  await openPortfolio(page); await expect(page.locator('tbody tr')).toHaveCount(4);
  await expect(page.getByRole('tab', { name: /^Leads/ })).toContainText('4');
  const region = page.getByRole('region', { name: /^Tabla de datos:/ });
  const email = page.getByText('persona1@dominio-institucional.example', { exact: true });
  expect(await email.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('nowrap');
  expect(await region.locator('table').evaluate(element => getComputedStyle(element).overflowWrap)).toBe('normal');
  await page.addStyleTag({ content: '.table-minimum-test { min-width: 2000px; }' });
  await region.locator('table').evaluate(element => element.classList.add('table-minimum-test'));
  await expect(region.locator('table')).toHaveCSS('min-width', '2000px');
  await region.locator('table').evaluate(element => element.classList.remove('table-minimum-test'));
  await assertPageWidth(page);
  await region.scrollIntoViewIfNeeded();
  await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  const actions = page.getByRole('button', { name: 'Acciones de María Fernanda Apellidos de prueba 1', exact: true });
  await expect(actions).toBeInViewport();
  await region.evaluate(element => { element.scrollLeft = 0; });
  if ([390, 1920].includes(page.viewportSize()!.width)) await page.screenshot({ path: testInfo.outputPath(`crm-${page.viewportSize()!.width}.png`) });
});

test('el componente compartido mantiene legibles los trabajadores y sus contactos', async ({ page }) => {
  await prepareContext(page.context(), 'backoffice'); await page.goto(`${origins.backoffice}/trabajadores`);
  const region = page.getByRole('region', { name: /^Tabla de datos:/ });
  await expect(region.locator('tbody tr')).toHaveCount(1);
  expect(await region.locator('table').evaluate(element => getComputedStyle(element).overflowWrap)).toBe('normal');
  const sizes = await region.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  if (page.viewportSize()!.width < 768) expect(sizes.scroll).toBeGreaterThan(sizes.client);
  await assertPageWidth(page);
});

test('el portal conserva su tabla en PC y sus tarjetas de cuotas en móvil', async ({ page }) => {
  await prepareContext(page.context(), 'portal-cliente'); await page.goto(`${origins['portal-cliente']}/portal/cronograma`);
  const table = page.locator('table'); await expect(table.locator('tbody tr').first()).toBeAttached();
  expect(await table.evaluate(element => getComputedStyle(element).overflowWrap)).toBe('normal');
  const region = table.locator('..');
  expect(await region.evaluate(element => getComputedStyle(element).overflowX)).toBe('auto');
  if (page.viewportSize()!.width < 768) await expect(table).toBeHidden(); else await expect(table).toBeVisible();
  await assertPageWidth(page);
});
