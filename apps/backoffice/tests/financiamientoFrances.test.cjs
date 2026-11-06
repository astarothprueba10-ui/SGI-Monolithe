const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calcularVenta, validarInicialAdicional,
  TASA_ANUAL_FIJA_PCT, TASA_MENSUAL_NOMINAL_PCT
} = require('../src/utils/financiamientoFrances.ts');

test('tasa nominal anual fija del 10% y mensual derivada de 10/12', () => {
  assert.equal(TASA_ANUAL_FIJA_PCT, 10);
  assert.equal(TASA_MENSUAL_NOMINAL_PCT, 10 / 12);
});

test('muestra error de inicial mínima inmediatamente', () => {
  assert.equal(validarInicialAdicional('3000', 30000, 500),
    'El monto inicial mínimo es de S/ 5,000.');
  assert.equal(validarInicialAdicional('4999.99', 30000, 500),
    'El monto inicial mínimo es de S/ 5,000.');
  assert.equal(validarInicialAdicional('5000', 30000, 500), null);
  assert.match(validarInicialAdicional('29500', 30000, 500), /saldo positivo/);
});

test('venta al contado descuenta solo la reserva del lote', () => {
  assert.equal(calcularVenta(30000, 500).saldoContado, 29500);
  assert.equal(calcularVenta(30000, 0).saldoContado, 30000);
});

test('francés: cuota constante, interés decreciente y capital creciente', () => {
  const plan = calcularVenta(30000, 500, 7000, 12);
  assert.equal(plan.capitalFinanciado, 22500);
  assert.equal(plan.cuotaMensual, 1978.11);
  assert.equal(plan.interesTotal, 1237.29);
  assert.equal(plan.totalCuotas, 23737.29);
  assert.equal(plan.totalOperacionConIntereses, 31237.29);
  assert.equal(plan.cuotas[0].interes, 187.50);
  assert.equal(plan.cuotas[0].capital, 1790.61);
  for (let k = 0; k < plan.cuotas.length - 1; k++) {
    assert.equal(plan.cuotas[k].cuota, 1978.11);
    if (k > 0) {
      assert.ok(plan.cuotas[k].interes < plan.cuotas[k - 1].interes);
      assert.ok(plan.cuotas[k].capital > plan.cuotas[k - 1].capital);
    }
  }
  assert.equal(plan.cuotas[11].cuota, 1978.08);
  assert.equal(plan.cuotas[11].saldo, 0);
});

test('sin reserva: financia precio menos inicial', () => {
  const plan = calcularVenta(30000, 0, 5000, 12);
  assert.equal(plan.capitalFinanciado, 25000);
  assert.equal(plan.cuotaMensual, 2197.90);
});

test('última cuota ajusta centavos y liquida el capital en 36 meses', () => {
  const plan = calcularVenta(30000.01, 500, 5000, 36);
  assert.equal(plan.cuotas.at(-1).saldo, 0);
  assert.equal(Number(plan.cuotas.reduce((s, c) => s + c.capital, 0).toFixed(2)), 24500.01);
  assert.equal(Number(plan.cuotas.reduce((s, c) => s + c.cuota, 0).toFixed(2)), plan.totalCuotas);
});

test('un solo mes: todos los intereses del periodo y saldo cero', () => {
  const plan = calcularVenta(30000, 500, 6000, 1);
  assert.equal(plan.cuotas.length, 1);
  assert.equal(plan.cuotas[0].interes, 195.83);
  assert.equal(plan.cuotas[0].saldo, 0);
});

test('rechaza inicial insuficiente, plazo fuera de rango y saldo sin financiar', () => {
  assert.throws(() => calcularVenta(30000, 500, 3000, 12));
  assert.throws(() => calcularVenta(5000, 500, 5000, 12));
  assert.throws(() => calcularVenta(30000, 500, 5000, 0.5));
  assert.throws(() => calcularVenta(30000, 500, 5000, 37));
});
