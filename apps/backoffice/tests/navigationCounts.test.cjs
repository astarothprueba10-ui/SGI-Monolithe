const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { navigationTrail } = require('../src/lib/navigationTrail.ts');
const calls = [];
let respond = () => ({ items: [], total: 37 });
const backend = Object.fromEntries(['buscarPeriodo', 'buscarSinPeriodo', 'compradores'].map(method => [method, async (...args) => {
  calls.push({ method, args }); return respond(method, args);
}]));
const original = Module._load;
Module._load = function (request, ...args) { return request === '../services/crmBackend' ? { crmBackend: backend } : original.call(this, request, ...args); };
const { queryLeadTable, loadCrmTableCounts } = require('../src/lib/crmTableQueries.ts');
Module._load = original;
const filters = { consulta: 'María', etapa: 'NUEVO', origen: 'WEB', idAsesor: 3, sinAsignar: true, idProyecto: 7 };
const range = { desde: '2026-01-01T00:00:00-05:00', hastaExclusivo: '2027-01-01T00:00:00-05:00' };

test('la ubicación incluye módulo, registro y pestaña con enlaces anteriores', () => {
  assert.deepEqual(navigationTrail('/proyectos/12', 'Proyecto de prueba', 'Lotes'), [
    { label: 'SIGI', to: '/' }, { label: 'Proyectos y lotes', to: '/proyectos' },
    { label: 'Proyecto de prueba', to: '/proyectos/12' }, { label: 'Lotes' }
  ]);
});

test('respeta límites de ruta y no confunde un nombre parecido con el módulo', () => {
  assert.equal(navigationTrail('/proyectos-inexistentes').at(-1).label, 'Página no encontrada');
  assert.equal(navigationTrail('/no-autorizado').at(-1).label, 'Acceso no autorizado');
  assert.equal(navigationTrail('/proyectos/12/').at(-1).label, 'Detalle');
});

test('muestra las secciones del CRM y los módulos sin pestañas', () => {
  assert.equal(navigationTrail('/crm', '', 'Clientes potenciales').at(-1).label, 'Clientes potenciales');
  assert.equal(navigationTrail('/trabajadores', '', 'Historial').at(-1).label, 'Historial');
  assert.equal(navigationTrail('/marketing').at(-1).label, 'Marketing');
});

test('consulta historial y conserva todos los filtros de cartera', async () => {
  calls.length = 0; await queryLeadTable(filters, null);
  assert.deepEqual(calls, [{ method: 'buscarSinPeriodo', args: [filters] }]);
});

test('las fechas propias de tabla usan el endpoint de período con los mismos filtros', async () => {
  calls.length = 0; await queryLeadTable(filters, range);
  assert.deepEqual(calls, [{ method: 'buscarPeriodo', args: [{ ...filters, ...range }] }]);
});

test('los contadores usan total del servidor y no las filas de la página', async () => {
  calls.length = 0; respond = (method, args) => ({ items: [], total: method === 'compradores' ? 9 : args[0].categoria === 'LEAD' ? 47 : 12 });
  assert.deepEqual(await loadCrmTableCounts(filters, null, ' Ana '), { leads: 47, potenciales: 12, compradores: 9 });
  assert.deepEqual(calls[0].args[0], { ...filters, categoria: 'LEAD', pagina: 1, tamano: 1 });
  assert.deepEqual(calls[1].args[0], { ...filters, categoria: 'POTENCIAL', pagina: 1, tamano: 1 });
  assert.deepEqual(calls[2].args, ['Ana', 1, 1]);
});

test('un rango incompleto no lanza una consulta histórica engañosa', async () => {
  calls.length = 0; await assert.rejects(queryLeadTable(filters, undefined));
  assert.equal(calls.length, 0);
});

test('un conteo fallido no borra otros resultados ni inventa cero registros', async () => {
  respond = (method, args) => { if (method !== 'compradores' && args[0].categoria === 'LEAD') throw new Error('Servicio no disponible'); return { total: 2 }; };
  assert.deepEqual(await loadCrmTableCounts(filters, null, ''), { leads: undefined, potenciales: 2, compradores: 2 });
});

test('un cero confirmado por el servidor sí se muestra como cero', async () => {
  respond = () => ({ total: 0 });
  assert.deepEqual(await loadCrmTableCounts(filters, range, ''), { leads: 0, potenciales: 0, compradores: 0 });
});

test('totales negativos o no numéricos quedan sin indicador', async () => {
  for (const value of [-1, NaN, undefined, '4']) {
    respond = () => ({ total: value });
    assert.deepEqual(await loadCrmTableCounts(filters, null, ''), { leads: undefined, potenciales: undefined, compradores: undefined });
  }
});
