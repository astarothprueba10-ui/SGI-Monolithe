/**
 * Sistema francés: cuota mensual constante, interés sobre saldo pendiente y
 * amortización creciente. Se ajusta la ÚLTIMA cuota por redondeo a céntimos.
 *
 * La política comercial existente fija una TASA NOMINAL ANUAL del 5%;
 * la tasa mensual aplicada es 5% / 12 (no se trata de una TEA del 5%).
 */
export interface CuotaFrancesa {
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
  cuotas: CuotaFrancesa[];
  cuotaMensual: number;
  totalCuotas: number;
  totalOperacionConIntereses: number;
  saldoContado: number;
}

export const TASA_ANUAL_FIJA_PCT = 5;
export const TASA_MENSUAL_NOMINAL_PCT = TASA_ANUAL_FIJA_PCT / 12;
export const MINIMO_INICIAL_ADICIONAL = 5000;

const centavos = (valor: number) => Math.round((valor + Number.EPSILON) * 100);
const soles = (valor: number) => valor / 100;

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
  if (![precioOficial, abonoReserva, inicialAdicional].every(Number.isFinite)
      || precioOficial <= 0 || abonoReserva < 0 || inicialAdicional < 0
      || abonoReserva + inicialAdicional > precioOficial
      || !Number.isInteger(numeroCuotas)
      || numeroCuotas < 0 || numeroCuotas > 36
      || (numeroCuotas > 0 && inicialAdicional < MINIMO_INICIAL_ADICIONAL)) {
    throw new Error('Condiciones de venta no válidas.');
  }

  const precio = centavos(precioOficial);
  const reserva = centavos(abonoReserva);
  const inicial = centavos(inicialAdicional);
  const principal = precio - reserva - inicial;
  if (principal < 0 || (numeroCuotas > 0 && principal <= 0)) {
    throw new Error('No existe saldo financiable.');
  }

  const tasa = TASA_ANUAL_FIJA_PCT / 1200;
  const potencia = Math.pow(1 + tasa, numeroCuotas);
  const cuotaBase = numeroCuotas > 0
    ? Math.round(principal * (tasa * potencia) / (potencia - 1))
    : 0;
  let saldo = principal;
  let interesTotal = 0;
  const cuotas: CuotaFrancesa[] = [];

  for (let numero = 1; numero <= numeroCuotas; numero++) {
    const interes = Math.round(saldo * tasa);
    const capital = numero === numeroCuotas ? saldo : cuotaBase - interes;
    const cuota = numero === numeroCuotas ? saldo + interes : cuotaBase;
    if (capital <= 0 || capital > saldo || cuota <= 0) {
      throw new Error('Cronograma francés inconsistente.');
    }
    saldo -= capital;
    interesTotal += interes;
    cuotas.push({
      numero,
      capital: soles(capital),
      interes: soles(interes),
      cuota: soles(cuota),
      saldo: soles(saldo)
    });
  }

  if (saldo !== 0 && numeroCuotas > 0) throw new Error('Saldo pendiente al finalizar.');
  return {
    precioOficial: soles(precio),
    abonoReserva: soles(reserva),
    inicialAdicional: soles(inicial),
    capitalFinanciado: soles(principal),
    interesTotal: soles(interesTotal),
    cuotaMensual: soles(cuotaBase),
    cuotas,
    totalCuotas: soles(principal + interesTotal),
    totalOperacionConIntereses: soles(precio + interesTotal),
    saldoContado: soles(precio - reserva)
  };
}
