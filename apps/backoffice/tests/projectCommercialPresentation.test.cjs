const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estadoInventarioLegible, condicionComercialLegible, contarLotesPorEtapa, resumirPublicacion }
  = require('../src/lib/commercialPresentation.ts');

const config = {
  datos: {
    etapas: [],
    manzanas: [{ id: 10, codigoEtapa: 'ALM-C01' }, { id: 20, codigoEtapa: 'ALM-C02' }],
    lotes: [{ id: 2, codigoEtapa: 'ALM-C02' }]
  },
  lotes: [
    { id: 1, idManzana: 10, codigo: 'ALM-L001' },
    { id: 2, idManzana: 10, codigo: 'ALM-L002' },
    { id: 3, idManzana: 20, codigo: 'ALM-L003' }
  ]
};
test('estado de inventario técnico se muestra de forma comprensible', () => {
  assert.equal(estadoInventarioLegible('NO_DISPONIBLE'), 'No habilitado para ventas');
  assert.equal(estadoInventarioLegible('DISPONIBLE'), 'Disponible en inventario');
  assert.equal(estadoInventarioLegible('RESERVADO'), 'Reservado');
  assert.equal(condicionComercialLegible('BLOQUEADA'), 'Bloqueada comercialmente');
});
test('cuenta correctamente asignaciones por lote que prevalecen sobre manzanas', () => {
  assert.equal(contarLotesPorEtapa(config, 'ALM-C01'), 1);
  assert.equal(contarLotesPorEtapa(config, 'ALM-C02'), 2);
});
test('la publicación distingue precio configurado de inventario liberado', () => {
  const base = { idLote: 1, codigo: 'ALM-L001', situacion: 'HABILITADA',
    estadoInventario: 'NO_DISPONIBLE', habilitarInventario: false };
  const r = resumirPublicacion([
    { ...base, habilitarInventario: true },
    { ...base, idLote: 2 },
    { ...base, idLote: 3, estadoInventario: 'DISPONIBLE' },
    { ...base, idLote: 4, situacion: 'BLOQUEADA', estadoInventario: 'DISPONIBLE' }
  ]);
  assert.deepEqual(r, { preciosPreparados: 3, habilitarInventario: 1, sinHabilitar: 1,
    yaDisponibles: 2, bloqueados: 1, protegidos: 0, errores: 0 });
});
