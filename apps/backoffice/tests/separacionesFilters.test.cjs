const assert = require('node:assert/strict');
const test = require('node:test');
const {
  FILTROS_SEPARACIONES_INICIALES,
  fechaCalendarioLima,
  filtrarSeparaciones,
  leyendaVencimiento
} = require('../src/utils/separacionesFiltros.ts');

const reserva = {
  id: 'SEPARACION-7',
  type: 'Separación',
  code: 'RES-92-7',
  buyer: 'Jaime Quispe Rios',
  document: '00123456',
  lot: 'MZ-C-L22',
  project: 'Residencial Campestre Los Cocos',
  paymentMethod: 'Transferencia bancaria',
  amount: 500,
  advisor: 'Adrianny Placeres',
  date: '5/11/2026',
  dateIso: '2026-11-06T03:09:34.054Z',
  expiresAtIso: '2026-11-13T03:09:34.054Z',
  expiresAt: '12/11/2026',
  status: 'VIGENTE'
};

test('interpreta correctamente fecha y vencimiento en America/Lima', () => {
  assert.equal(fechaCalendarioLima('2026-11-13T03:09:34.054Z'), '2026-11-12');
  assert.equal(fechaCalendarioLima('2026-11-06T03:09:34.054Z'), '2026-11-05');
  assert.equal(fechaCalendarioLima(null), '');
});

test('calcula dias faltantes y muestra Vencida desde el instante exacto', () => {
  const limite = Date.parse(reserva.expiresAtIso);
  assert.equal(leyendaVencimiento(reserva.expiresAtIso, 'VIGENTE',
    limite - 4 * 86400000), 'Vence en 4 días');
  assert.equal(leyendaVencimiento(reserva.expiresAtIso, 'VIGENTE',
    limite - 1), 'Vence en 1 día');
  assert.equal(leyendaVencimiento(reserva.expiresAtIso, 'VIGENTE',
    limite), 'Vencida');
  assert.equal(leyendaVencimiento(reserva.expiresAtIso, 'VENCIDA',
    limite - 100), 'Vencida');
  assert.equal(leyendaVencimiento(reserva.expiresAtIso, 'CONVERTIDA',
    limite + 100), null);
});

test('combina búsqueda, método, asesor, proyecto, rango inclusive y estado', () => {
  const filtro = {
    ...FILTROS_SEPARACIONES_INICIALES,
    busqueda: 'quíspe',
    metodoPago: 'Transferencia bancaria',
    asesor: 'Adrianny Placeres',
    proyecto: 'Residencial Campestre Los Cocos',
    desde: '2026-11-05',
    hasta: '2026-11-05',
    estado: 'VIGENTE'
  };
  const datos = [reserva, { ...reserva, id: 'VENTA-77', type: 'Venta' }];
  assert.deepEqual(filtrarSeparaciones(datos, filtro).map((v) => v.code), ['RES-92-7']);
  assert.equal(filtrarSeparaciones([reserva], { ...filtro, hasta: '2026-11-04' }).length, 0);
  assert.equal(filtrarSeparaciones([reserva], { ...filtro, metodoPago: 'Efectivo' }).length, 0);
  assert.equal(filtrarSeparaciones([reserva], { ...filtro, asesor: 'Otro asesor' }).length, 0);
  assert.equal(filtrarSeparaciones([reserva], { ...filtro, busqueda: '00123456' }).length, 1);
});

test('fecha vacía no coincide con filtro fechado y asesor sin asignar es específico', () => {
  assert.equal(filtrarSeparaciones(
    [{ ...reserva, dateIso: null }],
    { ...FILTROS_SEPARACIONES_INICIALES, desde: '2026-11-01' }
  ).length, 0);
  assert.equal(filtrarSeparaciones(
    [{ ...reserva, advisor: '' }],
    { ...FILTROS_SEPARACIONES_INICIALES, asesor: '__sin_asesor__' }
  ).length, 1);
});
