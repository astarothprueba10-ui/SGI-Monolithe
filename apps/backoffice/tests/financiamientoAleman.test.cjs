const assert = require('node:assert/strict');
const test = require('node:test');
const { calcularVenta } = require('../src/utils/financiamientoAleman.ts');

test('venta al contado descuenta solo la reserva del mismo lote', () => {
  assert.equal(calcularVenta(30000, 500).saldoContado, 29500);
  assert.equal(calcularVenta(30000, 0).saldoContado, 30000);
});

test('alemán descuenta reserva e inicial por separado, intereses decrecientes', () => {
  const plan = calcularVenta(30000, 500, 5000, 12, 1.25);
  assert.equal(plan.capitalFinanciado, 24500);
  assert.equal(plan.interesTotal, 1990.63);
  assert.equal(plan.totalCuotas, 26490.63);
  assert.equal(plan.totalOperacionConIntereses, 31990.63);
  assert.equal(plan.cuotas[0].interes, 306.25);
  assert.equal(plan.cuotas.at(-1).saldo, 0);
  assert.ok(plan.cuotas[0].cuota > plan.cuotas.at(-1).cuota);
  assert.equal(
    Number(plan.cuotas.reduce((total, cuota) => total + cuota.capital, 0).toFixed(2)),
    24500
  );
});

test('sin reserva financia precio menos inicial', () => {
  const plan = calcularVenta(30000, 0, 5000, 12, 1.25);
  assert.equal(plan.capitalFinanciado, 25000);
  assert.equal(plan.totalOperacionConIntereses, 30000 + plan.interesTotal);
});

test('redondea la última amortización sin saldo residual', () => {
  const plan = calcularVenta(30000.01, 500, 5000, 36, 0.75);
  assert.equal(plan.cuotas.at(-1).saldo, 0);
  assert.equal(
    Number(plan.cuotas.reduce((suma, cuota) => suma + cuota.capital, 0).toFixed(2)),
    plan.capitalFinanciado
  );
});

test('rechaza inicial y reserva que consumen el precio o rango de cuotas inválido', () => {
  assert.throws(() => calcularVenta(5000, 500, 5000, 12, 1.25));
  assert.throws(() => calcularVenta(30000, 500, 5000, 37, 1.25));
  assert.throws(() => calcularVenta(30000, 500, 5000, 1.5, 1.25));
  assert.throws(() => calcularVenta(30000, 500, 5000, 12, -1));
});
