/**
 * Sistema francés para NUEVAS ventas: tasa nominal anual fija del 10%.
 *
 * El comprador elige una INICIAL TOTAL (mínimo S/ 5,000), que puede incluir
 * la separación de S/ 500 si fue confirmada y es aplicable a esta venta.
 * El backend autoriza la aplicación; esta utilidad es solo una previsualización.
 *
 * Cuotas en céntimos y última cuota ajustada para amortizar el 100% del capital.
 * El backend es la fuente definitiva y debe verificar el mismo cronograma.
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
  inicialTotal: number;
  inicialAdicional: number;
  capitalFinanciado: number;
  interesTotal: number;
  cuotas: CuotaFrancesa[];
  cuotaMensual: number;
  totalCuotas: number;
  totalOperacionConIntereses: number;
  saldoContado: number;
}

export const TASA_ANUAL_FIJA_PCT = 10;
export const TASA_MENSUAL_NOMINAL_PCT = TASA_ANUAL_FIJA_PCT / 12;
export const MINIMO_INICIAL_TOTAL = 5000;

const monedaValida = (valor: number) =>
  Number.isFinite(valor) && valor >= 0
  && Math.abs(valor * 100 - Math.round(valor * 100)) < 0.000001
  && Number.isSafeInteger(Math.round(valor * 100));
const centavos = (valor: number) => Math.round((valor + Number.EPSILON) * 100);
const soles = (valor: number) => valor / 100;

export function validarInicialTotal(
  valor: string,
  precioOficial: number | null,
  abonoReserva = 0
): string | null {
  if (!valor.trim()) return null;
  const monto = Number(valor);
  if (!monedaValida(monto)) return 'Ingrese una inicial válida con máximo dos decimales.';
  if (monto < MINIMO_INICIAL_TOTAL) return 'La inicial total mínima es de S/ 5,000.';
  if (!monedaValida(abonoReserva) || abonoReserva > monto)
    return 'La separación aplicada no puede superar la inicial total.';
  if (precioOficial !== null && (!monedaValida(precioOficial) || monto >= precioOficial))
    return 'La inicial total debe dejar un capital positivo por financiar.';
  return null;
}

export function calcularVenta(
  precioOficial: number,
  abonoReserva = 0,
  inicialTotal = 0,
  numeroCuotas = 0
): ResumenVentaCalculado {
  if (![precioOficial, abonoReserva, inicialTotal].every(monedaValida)
      || precioOficial <= 0 || abonoReserva > precioOficial
      || !Number.isInteger(numeroCuotas) || numeroCuotas < 0 || numeroCuotas > 36
      || (numeroCuotas === 0 && inicialTotal !== 0)
      || (numeroCuotas > 0 && (
        inicialTotal < MINIMO_INICIAL_TOTAL ||
        inicialTotal >= precioOficial ||
        abonoReserva > inicialTotal
      ))) {
    throw new Error('Condiciones de venta no válidas.');
  }

  const precio = centavos(precioOficial);
  const reserva = centavos(abonoReserva);
  const inicial = centavos(inicialTotal);
  const adicional = numeroCuotas > 0 ? inicial - reserva : 0;
  const principal = numeroCuotas > 0 ? precio - inicial : 0;

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
    if (capital <= 0 || capital > saldo || cuota <= 0)
      throw new Error('Cronograma francés inconsistente.');
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

  if (saldo !== 0 && numeroCuotas > 0)
    throw new Error('Saldo pendiente al finalizar.');
  return {
    precioOficial: soles(precio),
    abonoReserva: soles(reserva),
    inicialTotal: soles(inicial),
    inicialAdicional: soles(adicional),
    capitalFinanciado: soles(principal),
    interesTotal: soles(interesTotal),
    cuotaMensual: soles(cuotaBase),
    cuotas,
    totalCuotas: soles(principal + interesTotal),
    totalOperacionConIntereses: soles(precio + interesTotal),
    saldoContado: soles(precio - reserva)
  };
}
