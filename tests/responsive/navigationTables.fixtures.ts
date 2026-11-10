import type { Page } from '@playwright/test';
import { origins, prepareContext } from './fixtures';

/** Respuestas CRM controladas para reproducir cifras globales y listados distintos. */
export interface PortfolioFixture { total: number; failedCounts?: boolean; slowQuery?: string; queries: URL[] }

function prospect(index: number, category: string, query: string) {
  return { id_prospecto: index + 1, id_persona: index + 1, codigo: `LDN-${index + 1}`, nombre_completo: `${query || 'María Fernanda'} Apellidos de prueba ${index + 1}`,
    email: `persona${index + 1}@dominio-institucional.example`, telefono: '987654321', categoria: category,
    interes: 'Residencial Campestre de prueba', origen_codigo: index % 2 ? 'WEB' : 'WHATSAPP', origen_nombre: index % 2 ? 'Página web' : 'WhatsApp',
    asesor_nombre: 'Asesor de prueba con apellidos', estado_codigo: 'NUEVO', estado_nombre: 'Nuevo', fecha_registro: '2026-10-30T15:00:00Z',
    ultimo_contacto: '2026-11-01T15:00:00Z' };
}

function pageFor(url: URL, state: PortfolioFixture) {
  const category = url.searchParams.get('categoria') ?? 'LEAD'; const query = url.searchParams.get('consulta') ?? '';
  const total = url.pathname.endsWith('/compradores') ? 1 : category === 'POTENCIAL' ? 2 : query || url.searchParams.get('origen') ? 1 : state.total;
  const size = Number(url.searchParams.get('tamano') ?? 15); const page = Number(url.searchParams.get('pagina') ?? 1);
  const items = Array.from({ length: Math.max(0, Math.min(size, total - (page - 1) * size)) }, (_, index) => prospect(index + (page - 1) * size, category, query));
  return { items, total, pagina: page, tamano: size, paginas: Math.ceil(total / size) };
}

function otherResponse(path: string) {
  if (path.endsWith('/catalogos')) return { estados: [{ codigo: 'NUEVO', nombre: 'Nuevo', final: false }],
    origenes: [{ codigo: 'WEB', nombre: 'Página web' }, { codigo: 'WHATSAPP', nombre: 'WhatsApp' }], tiposSeguimiento: [],
    proyectos: [{ id: 1, codigo: 'PROY-001', nombre: 'Proyecto de prueba' }], turnosVisita: [], zonaHorariaVisitas: 'America/Lima' };
  if (path.endsWith('/asesores')) return [];
  if (path.includes('/resumen')) return { total: 0, leads: 0, potenciales: 0, compradores: 0, cerrados: 0, sinAsesor: 0 };
  return { items: [], total: 0, pagina: 1, tamano: 15, paginas: 0 };
}

/** Abre la cartera con API simulada y permite inspeccionar todos sus filtros. */
export async function openPortfolio(page: Page, overrides: Partial<PortfolioFixture> = {}) {
  const state: PortfolioFixture = { total: 4, queries: [], ...overrides };
  await prepareContext(page.context(), 'backoffice');
  await page.context().route('**/api/core/crm/**', async route => {
    const url = new URL(route.request().url()); state.queries.push(url);
    const isTable = url.pathname.includes('/buscar') || url.pathname.endsWith('/compradores');
    if (!isTable) return route.fulfill({ json: otherResponse(url.pathname) });
    if (state.failedCounts && url.searchParams.get('tamano') === '1') return route.fulfill({ status: 503, json: { message: 'Conteo temporalmente no disponible' } });
    const response = pageFor(url, state);
    if (url.searchParams.get('consulta') === state.slowQuery) await new Promise(resolve => setTimeout(resolve, 900));
    return route.fulfill({ json: response });
  });
  await page.goto(`${origins.backoffice}/crm`);
  return state;
}
