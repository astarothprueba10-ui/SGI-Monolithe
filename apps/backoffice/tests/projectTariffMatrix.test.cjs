const assert = require('node:assert/strict');
const { test } = require('node:test');
const { admiteMatrizRecargos, importeZona, calcularMatrizTarifas, aplicarVigenciaTarifas,
  tarifaDeZona, completarEtapasConTarifas } = require('../src/lib/projectTariffMatrix.ts');

const etapas = ['E1', 'E2', 'E3', 'E4', 'E5'].map(codigo => ({
  codigo, nombre: codigo, disponibilidad: 'REGULAR', tipoDescuento: 'NINGUNO', descuento: 0
}));
const zonas = ['D','A','B','C','AB','AC','BC','ABC'];
const recargos = { A: 5000, B: 3000, C: 3000 };

test('matriz compuesta calcula los ocho precios de Alameda sin duplicar recargos', () => {
  assert.equal(admiteMatrizRecargos(zonas), true);
  assert.deepEqual(zonas.map(z => importeZona(z,50000,recargos)), [
    50000,55000,53000,53000,58000,58000,56000,61000
  ]);
});

test('calcula 40 tarifas por etapa y zona conservando la configuración comercial', () => {
  const datos = { etapas, lotes: [], manzanas: [], tarifas: [] };
  const tarifas = calcularMatrizTarifas(datos, zonas, etapas.map(e=>e.codigo), 'PEN',
    50000,recargos,'2026-11-21',null);
  assert.equal(tarifas.length,40);
  assert.equal(tarifaDeZona(tarifas,'E2','PEN','ABC').valor,61000);
  assert.equal(tarifaDeZona(tarifas,'E1','PEN','D').vigenteHasta,null);
  const deNuevo = calcularMatrizTarifas({ ...datos, tarifas },zonas,['E1'],'PEN',
    51000,recargos,'2026-11-21',null);
  assert.equal(deNuevo.length,40);
  assert.equal(tarifaDeZona(deNuevo,'E1','PEN','D').valor,51000);
  assert.equal(tarifaDeZona(deNuevo,'E2','PEN','D').valor,50000);
});

test('aplica fechas en bloque por etapa, sin obligación de fecha fin', () => {
  const datos = { etapas, lotes: [], manzanas: [], tarifas: [] };
  const tarifas = calcularMatrizTarifas(datos,zonas,['E1','E2'],'PEN',50000,recargos,'2026-11-21',null);
  const actualizado = aplicarVigenciaTarifas(tarifas,['E1'],'PEN','2026-12-01','2027-01-31');
  assert.equal(tarifaDeZona(actualizado,'E1','PEN','D').vigenteHasta,'2027-01-31');
  assert.equal(tarifaDeZona(actualizado,'E2','PEN','D').vigenteHasta,null);
  const indefinido = aplicarVigenciaTarifas(actualizado,['E1'],'PEN','2026-12-01',null);
  assert.equal(tarifaDeZona(indefinido,'E1','PEN','D').vigenteHasta,null);
});

test('rechaza zonas desconocidas, importes negativos o fechas invertidas', () => {
  assert.equal(admiteMatrizRecargos(['Z-NORTE']),false);
  assert.throws(()=>importeZona('ABC',50000,{ A:5000,B:-1,C:3000 }),/válidos/);
  assert.throws(()=>aplicarVigenciaTarifas([],['E1'],'PEN','2027-01-01','2026-01-01'),/rango/);
});

test('rellena tarifas faltantes de otras etapas sin sobrescribir precios propios', () => {
  const datos = { etapas, manzanas: [], lotes: [], tarifas: [] };
  const origen = calcularMatrizTarifas(datos,['D','A'],['E1'],'PEN',50000,recargos,'2026-11-21',null);
  const otro = calcularMatrizTarifas({ ...datos, tarifas: origen },['D'],['E2'],'PEN',60000,recargos,'2026-12-01',null);
  const copiado = completarEtapasConTarifas(otro,'E1',['E1','E2','E3'],'PEN');
  assert.equal(tarifaDeZona(copiado,'E2','PEN','D').valor,60000);
  assert.equal(tarifaDeZona(copiado,'E2','PEN','A').valor,55000);
  assert.equal(tarifaDeZona(copiado,'E3','PEN','D').valor,50000);
  assert.equal(copiado.length,6);
  assert.equal(completarEtapasConTarifas(copiado,'E1',['E1','E2','E3'],'PEN').length,6);
});
