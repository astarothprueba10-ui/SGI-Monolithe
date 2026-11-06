/** Sistema alemán: amortización de capital constante e interés sobre saldo insoluto. */
export interface CuotaAlemana {
  numero: number;
  capital: number;
  interes: number;
  cuota: number;
  saldo: number;
}

export interface ResumenVentaCalculado {
  precioOficial: number;
  abonoReserva: number;
  inicialAdicional: number;
  capitalFinanciado: number;
  interesTotal: number;
  cuotas: CuotaAlemana[];
  totalCuotas: number;
  totalOperacionConIntereses: number;
  saldoContado: number;
}

const centavos = (monto: number) => Math.round((monto + Number.EPSILON) * 100);
const soles = (cents: number) => cents / 100;

/** 5 % nominal anual fijo. Para el sistema alemán usamos la tasa mensual 5 / 12. */
export const TASA_ANUAL_FIJA_PCT = 5;
export const TASA_MENSUAL_NOMINAL_PCT = TASA_ANUAL_FIJA_PCT / 12;

export const MINIMO_INICIAL_ADICIONAL = 5000;

/** Validación reactiva: permite mostrar el aviso rojo mientras se escribe. */
export function validarInicialAdicional(
  valor: string,
  precioOficial: number | null,
  abonoReserva = 0
): string | null {
  if (!valor.trim()) return null;
  const monto = Number(valor);
  if (!Number.isFinite(monto) || monto < 0) return 'Ingrese un monto inicial válido.';
  if (monto < MINIMO_INICIAL_ADICIONAL) return 'El monto inicial mínimo es de S/ 5,000.';
  if (precioOficial !== null && Number.isFinite(precioOficial)
      && monto + abonoReserva >= precioOficial) {
    return 'La inicial debe dejar un saldo positivo después de descontar la reserva.';
  }
  return null;
}


export function calcularVenta(
  precioOficial: number,
  abonoReserva = 0,
  inicialAdicional = 0,
  numeroCuotas = 0
): ResumenVentaCalculado {
  const tasaMensualPct = TASA_MENSUAL_NOMINAL_PCT;
  if (![precioOficial, abonoReserva, inicialAdicional, tasaMensualPct].every(Number.isFinite)
      || precioOficial <= 0 || abonoReserva < 0 || inicialAdicional < 0
      || abonoReserva + inicialAdicional > precioOficial
      || tasaMensualPct < 0 || tasaMensualPct > 100
      || !Number.isInteger(numeroCuotas) || numeroCuotas < 0 || numeroCuotas > 36) {
    throw new Error('Condiciones de venta no válidas.');
  }
  const precio = centavos(precioOficial);
  const reserva = centavos(abonoReserva);
  const inicial = centavos(inicialAdicional);
  const capital = precio - reserva - inicial;
  if (capital < 0) throw new Error('Los pagos superan el precio oficial.');
  if (numeroCuotas > 0 && capital <= 0) throw new Error('No existe saldo financiable.');
  const cuotas: CuotaAlemana[] = [];
  const capitalBase = numeroCuotas ? Math.floor(capital / numeroCuotas) : 0;
  let saldo = capital;
  let totalIntereses = 0;
  for (let numero = 1; numero <= numeroCuotas; numero++) {
    const amortizacion = numero === numeroCuotas ? saldo : capitalBase;
    const interes = Math.round(saldo * tasaMensualPct / 100);
    saldo -= amortizacion;
    totalIntereses += interes;
    cuotas.push({
      numero,
      capital: soles(amortizacion),
      interes: soles(interes),
      cuota: soles(amortizacion + interes),
      saldo: soles(saldo)
    });
  }
  return {
    precioOficial: soles(precio),
    abonoReserva: soles(reserva),
    inicialAdicional: soles(inicial),
    capitalFinanciado: soles(capital),
    interesTotal: soles(totalIntereses),
    cuotas,
    totalCuotas: soles(capital + totalIntereses),
    totalOperacionConIntereses: soles(precio + totalIntereses),
    saldoContado: soles(precio - reserva)
  };
}
