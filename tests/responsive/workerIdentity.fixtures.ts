import { expect, type Page, type Route } from '@playwright/test';
import { assertDialog } from './assertions';
import { origins, prepareContext } from './fixtures';

/** Documento consultado mediante el permiso exclusivo de alta de RRHH. */
export type WorkerDocument = { idTipoDocumento: number; numeroDocumento: string };
type Lookup = (document: WorkerDocument, route: Route) => Promise<void>;

/** Respuesta externa sin persona local ni datos de contacto inventados. */
export function workerFound(document: WorkerDocument) {
  return { ...document, estado: 'ENCONTRADO', fuente: 'DNI', personaRegistrada: null,
    persona: { nombres: document.numeroDocumento.endsWith('2') ? 'ANDREA' : 'LUCÍA MARÍA',
      apellidoPaterno: 'MUÑOZ', apellidoMaterno: 'DE LA CRUZ' }, mensaje: 'Revisa los nombres encontrados.' };
}

function location(parent: string | null) {
  const names: Record<string, string> = { root: 'PERÚ', '10': 'LAMBAYEQUE', '11': 'CHICLAYO', '12': 'PIMENTEL' };
  const ids: Record<string, number> = { root: 10, '10': 11, '11': 12, '12': 13 };
  const key = parent ?? 'root';
  return names[key] ? [{ idUbicacion: ids[key], nombre: names[key], codigo: String(ids[key]), tipo: key }] : [];
}

async function mockWorkerRoute(route: Route, calls: WorkerDocument[], writes: Record<string, unknown>[], lookup?: Lookup) {
  const request = route.request();
  if (request.url().endsWith('/personas/consultar')) {
    const body = request.postDataJSON(); calls.push(body);
    return lookup ? lookup(body, route) : route.fulfill({ json: workerFound(body) });
  }
  if (request.method() !== 'POST') return route.fallback();
  writes.push(request.postDataJSON()); return route.fulfill({ json: { idTrabajador: 2 } });
}

/** Prepara RRHH sin permisos CRM y abre el formulario con catálogos simulados. */
export async function prepareWorker(page: Page, lookup?: Lookup) {
  await prepareContext(page.context(), 'backoffice');
  await page.context().addInitScript(() => {
    const user = JSON.parse(localStorage.getItem('monolithe_user')!);
    localStorage.setItem('monolithe_user', JSON.stringify({ ...user, autoridades: ['ROLE_RRHH', 'hr.view', 'hr.create'] }));
  });
  const calls: WorkerDocument[] = []; const writes: Record<string, unknown>[] = [];
  await page.context().route('**/api/core/ubicaciones**', route => route.fulfill({ json: location(new URL(route.request().url()).searchParams.get('padreId')) }));
  await page.context().route('**/api/core/trabajadores**', route => mockWorkerRoute(route, calls, writes, lookup));
  await page.goto(`${origins.backoffice}/trabajadores`);
  await page.getByRole('button', { name: 'Nuevo trabajador', exact: true }).click();
  const dialog = await assertDialog(page, 'Nuevo trabajador');
  await page.locator('#idTipoDocumento').selectOption('1');
  return { dialog, calls, writes };
}

/** Completa los datos laborales y geográficos necesarios para guardar realmente. */
export async function fillWorkerDetails(page: Page) {
  await page.locator('#direccion').fill('Avenida de prueba 123');
  await page.locator('#telefono').fill('987654321');
  await page.locator('#correoElectronico').fill('persona@institucion.example');
  for (const [id, name] of [['geo-departamento', 'LAMBAYEQUE'], ['geo-provincia', 'CHICLAYO'], ['geo-distrito', 'PIMENTEL']]) {
    await expect(page.locator(`#${id}`)).toBeEnabled(); await page.locator(`#${id}`).click();
    await page.getByRole('option', { name: new RegExp(`^${name}\\b`) }).click();
  }
  for (const id of ['idArea', 'idCargo', 'idTipoVinculoLaboral']) await page.locator(`#${id}`).selectOption('1');
  const today = await page.locator('#fechaIngreso').getAttribute('min');
  await page.locator('#fechaIngreso').fill(today!);
}

/** Permite entregar respuestas tardías para comprobar cancelación y cambios de DNI. */
export function deferredWorker() {
  let release!: () => void; let delivered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const done = new Promise<void>(resolve => { delivered = resolve; });
  const send = async (document: WorkerDocument, route: Route) => {
    await gate; await route.fulfill({ json: workerFound(document) }); delivered();
  };
  return { release, done, send };
}
