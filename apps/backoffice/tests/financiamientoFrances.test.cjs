const assert = require('node:assert/strict');
const test = require('node:test');
const {
  calcularVenta, validarInicialTotal,
  TASA_ANUAL_FIJA_PCT, TASA_MENSUAL_NOMINAL_PCT
} = require('../src/utils/financiamientoFrances.ts');

const enCentavos = (n) => Math.round(n * 100);

test('tasa nominal anual fija del 10% y mensual derivada de 10/12', () => {
  assert.equal(TASA_ANUAL_FIJA_PCT, 10);
  assert.equal(TASA_MENSUAL_NOMINAL_PCT, 10 / 12);
});

test('muestra error de inicial TOTAL minima inmediatamente', () => {
  assert.match(validarInicialTotal('3000', 30000, 500), /inicial total mínima/);
  assert.match(validarInicialTotal('4999.99', 30000, 500), /inicial total mínima/);
  assert.equal(validarInicialTotal('5000', 30000, 500), null);
  assert.match(validarInicialTotal('30000', 30000, 500), /capital positivo/);
  assert.match(validarInicialTotal('5000.001', 30000, 500), /dos decimales/);
});

test('venta al contado descuenta solo la reserva del lote', () => {
  assert.equal(calcularVenta(30000, 500).saldoContado, 29500);
  assert.equal(calcularVenta(30000, 0).saldoContado, 30000);
});

test('inicial TOTAL puede incluir los S/ 500 confirmados de separacion', () => {
  const sinReserva = calcularVenta(30000, 0, 5000, 12);
  const conReserva = calcularVenta(30000, 500, 5000, 12);
  assert.equal(conReserva.inicialTotal, 5000);
  assert.equal(conReserva.inicialAdicional, 4500);
  assert.equal(conReserva.abonoReserva, 500);
  assert.equal(conReserva.capitalFinanciado, 25000);
  assert.equal(conReserva.interesTotal, 1374.75);
  assert.equal(sinReserva.capitalFinanciado, conReserva.capitalFinanciado);
  assert.equal(sinReserva.interesTotal, conReserva.interesTotal);
});

test('frances: cuota constante, interes decreciente y capital creciente', () => {
  // Antes: reserva 500 + inicial adicional 7,000. Ahora: inicial total 7,500.
  const plan = calcularVenta(30000, 500, 7500, 12);
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

test('inicial elegida de S/ 8,000 evita el doble descuento', () => {
  const plan = calcularVenta(30000, 500, 8000, 36);
  assert.equal(plan.inicialAdicional, 7500);
  assert.equal(plan.capitalFinanciado, 22000);
  assert.equal(plan.interesTotal, 3555.59);
  assert.equal(plan.totalCuotas, 25555.59);
  assert.equal(plan.totalOperacionConIntereses, 33555.59);
});

test('sin reserva financia precio menos inicial', () => {
  const plan = calcularVenta(30000, 0, 5000, 12);
  assert.equal(plan.capitalFinanciado, 25000);
  assert.equal(plan.cuotaMensual, 2197.90);
});

test('ultima cuota ajusta centimos y liquida el capital en 36 meses', () => {
  const plan = calcularVenta(30000.01, 500, 5500, 36);
  assert.equal(plan.cuotas.at(-1).saldo, 0);
  assert.equal(Number(plan.cuotas.reduce((s, c) => s + c.capital, 0).toFixed(2)), 24500.01);
  assert.equal(Number(plan.cuotas.reduce((s, c) => s + c.cuota, 0).toFixed(2)), plan.totalCuotas);
});

test('un solo mes: todos los intereses del periodo y saldo cero', () => {
  const plan = calcularVenta(30000, 500, 6500, 1);
  assert.equal(plan.cuotas.length, 1);
  assert.equal(plan.cuotas[0].interes, 195.83);
  assert.equal(plan.cuotas[0].saldo, 0);
});

test('regresiones exactas del redondeo SQL y TypeScript', () => {
  const casos = [
    [30000, 5000, 1, 208.33],
    [30000, 5000, 12, 1374.75],
    [30000, 5000, 36, 4040.50],
    [29900, 5000, 36, 4024.35],
    [85250, 5000, 36, 12969.91]
  ];
  for (const [precio, inicial, plazo, interes] of casos) {
    const r = calcularVenta(precio, 0, inicial, plazo);
    assert.equal(r.interesTotal, interes, `${precio} / ${inicial} / ${plazo}`);
    assert.equal(r.cuotas.at(-1).saldo, 0);
  }
});

test('60 escenarios liquidan capital, intereses y cuotas sin diferencias', () => {
  const precios = [29900, 30000, 31865.63, 52560, 85250];
  const iniciales = [5000, 8000, 10000];
  const plazos = [1, 12, 24, 36];
  let count = 0;
  for (const precio of precios) {
    for (const inicial of iniciales) {
      for (const plazo of plazos) {
        const p = calcularVenta(precio, 0, inicial, plazo);
        const capital = p.cuotas.reduce((acc, c) => acc + enCentavos(c.capital), 0);
        const intereses = p.cuotas.reduce((acc, c) => acc + enCentavos(c.interes), 0);
        const cuotas = p.cuotas.reduce((acc, c) => acc + enCentavos(c.cuota), 0);
        assert.equal(capital, enCentavos(p.capitalFinanciado));
        assert.equal(intereses, enCentavos(p.interesTotal));
        assert.equal(cuotas, enCentavos(p.totalCuotas));
        assert.equal(p.cuotas.at(-1).saldo, 0);
        count++;
      }
    }
  }
  assert.equal(count, 60);
});

test('rechaza inicial insuficiente, importe mal redondeado o plazo fuera de rango', () => {
  for (const args of [
    [30000, 500, 4999.99, 12],
    [5000, 500, 5000, 12],
    [30000, 500, 5000, 0.5],
    [30000, 500, 5000, 37],
    [30000, 501, 500, 12],
    [30000, 500.001, 5000, 12],
    [30000, 500, 5000.001, 12]
  ]) assert.throws(() => calcularVenta(...args));
});
