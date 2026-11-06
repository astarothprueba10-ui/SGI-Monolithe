const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calcularVenta,
  validarInicialAdicional,
  TASA_ANUAL_FIJA_PCT,
  TASA_MENSUAL_NOMINAL_PCT
} = require('../src/utils/financiamientoAleman.ts');

test('la tasa es 5% anual nominal, fija y equivalente a 5/12 mensual', () => {
  assert.equal(TASA_ANUAL_FIJA_PCT, 5);
  assert.equal(TASA_MENSUAL_NOMINAL_PCT, 5 / 12);
});

test('la inicial muestra el aviso rojo apenas baja de 5000', () => {
  assert.equal(validarInicialAdicional('3000', 30000, 500),
    'El monto inicial mínimo es de S/ 5,000.');
  assert.equal(validarInicialAdicional('4999.99', 30000, 500),
    'El monto inicial mínimo es de S/ 5,000.');
  assert.equal(validarInicialAdicional('5000', 30000, 500), null);
  assert.equal(validarInicialAdicional('6000', 30000, 500), null);
  assert.equal(validarInicialAdicional('', 30000, 500), null);
  assert.match(validarInicialAdicional('29500', 30000, 500), /saldo positivo/);
});

test('venta al contado descuenta solo la reserva aplicable', () => {
  assert.equal(calcularVenta(30000, 500).saldoContado, 29500);
  assert.equal(calcularVenta(30000, 0).saldoContado, 30000);
});

test('alemán aplica reserva e inicial por separado al 5% anual y cuotas decrecientes', () => {
  const plan = calcularVenta(30000, 500, 6000, 12);
  assert.equal(plan.capitalFinanciado, 23500);
  assert.equal(plan.interesTotal, 636.48);
  assert.equal(plan.totalCuotas, 24136.48);
  assert.equal(plan.totalOperacionConIntereses, 30636.48);
  assert.equal(plan.cuotas[0].interes, 97.92);
  assert.equal(plan.cuotas[0].cuota, 2056.25);
  assert.equal(plan.cuotas[plan.cuotas.length - 1].cuota, 1966.53);
  assert.equal(plan.cuotas[plan.cuotas.length - 1].saldo, 0);
  assert.ok(plan.cuotas[0].cuota > plan.cuotas[plan.cuotas.length - 1].cuota);
  assert.equal(
    Number(plan.cuotas.reduce((sum, cuota) => sum + cuota.capital, 0).toFixed(2)),
    plan.capitalFinanciado
  );
});

test('sin reserva, el capital se calcula solo con precio menos inicial', () => {
  const plan = calcularVenta(30000, 0, 5000, 12);
  assert.equal(plan.capitalFinanciado, 25000);
  assert.equal(plan.totalOperacionConIntereses, 30000 + plan.interesTotal);
});

test('el último pago no deja saldo residual aun con céntimos y 36 cuotas', () => {
  const plan = calcularVenta(30000.01, 500, 5000, 36);
  assert.equal(plan.cuotas[plan.cuotas.length - 1].saldo, 0);
  assert.equal(
    Number(plan.cuotas.reduce((sum, cuota) => sum + cuota.capital, 0).toFixed(2)),
    plan.capitalFinanciado
  );
});

test('rechaza importes que consumen el precio y plazos inválidos', () => {
  assert.throws(() => calcularVenta(5000, 500, 5000, 12));
  assert.throws(() => calcularVenta(30000, 500, 5000, 37));
  assert.throws(() => calcularVenta(30000, 500, 5000, 1.5));
});
