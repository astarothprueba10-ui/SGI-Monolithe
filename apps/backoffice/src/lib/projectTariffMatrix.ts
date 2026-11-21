import type { ConfiguracionComercial, TarifaComercial } from '../types/projectConfiguration';

export const ZONAS_MATRIZ = ['D', 'A', 'B', 'C', 'AB', 'AC', 'BC', 'ABC'] as const;

export function admiteMatrizRecargos(zonas: readonly string[]): boolean {
  return zonas.length > 0 && zonas.includes('D') &&
    zonas.every(z => (ZONAS_MATRIZ as readonly string[]).includes(z));
}

export function importeZona(codigo: string, base: number, recargos: Record<string, number>): number {
  if (!(ZONAS_MATRIZ as readonly string[]).includes(codigo))
    throw new Error(`La zona ${codigo} necesita un precio propio.`);
  if (![base, recargos.A, recargos.B, recargos.C].every(v => Number.isFinite(v) && v >= 0))
    throw new Error('Los precios y recargos deben ser números válidos, iguales o mayores a cero.');
  return Number((base + (codigo === 'D' ? 0 : [...codigo].reduce((sum, z) => sum + recargos[z], 0))).toFixed(4));
}

export function tarifaDeZona(tarifas: readonly TarifaComercial[],
  etapa: string, moneda: string, zona: string): TarifaComercial | undefined {
  return tarifas.find(t => t.codigoEtapa === etapa && t.moneda === moneda && t.codigoZona === zona);
}

export function actualizarTarifa(
  tarifas: readonly TarifaComercial[], tarifa: TarifaComercial): TarifaComercial[] {
  const otras = tarifas.filter(t => !(t.codigoEtapa === tarifa.codigoEtapa &&
    t.moneda === tarifa.moneda && t.codigoZona === tarifa.codigoZona));
  return [...otras, tarifa];
}

export function vigenciaValida(desde: string, hasta: string | null): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(desde) &&
    (!hasta || /^\d{4}-\d{2}-\d{2}$/.test(hasta) && hasta >= desde);
}

export function aplicarVigenciaTarifas(
  tarifas: readonly TarifaComercial[], etapas: readonly string[], moneda: string,
  desde: string, hasta: string | null): TarifaComercial[] {
  if (!vigenciaValida(desde, hasta)) throw new Error('Revisa el rango de vigencia.');
  return tarifas.map(t => etapas.includes(t.codigoEtapa) && t.moneda === moneda
    ? { ...t, vigenteDesde: desde, vigenteHasta: hasta } : t);
}

export function calcularMatrizTarifas(
  datos: ConfiguracionComercial, zonas: readonly string[], etapas: readonly string[],
  moneda: string, base: number, recargos: Record<string, number>,
  vigenteDesde: string, vigenteHasta: string | null): TarifaComercial[] {
  if (!admiteMatrizRecargos(zonas)) throw new Error('El proyecto no utiliza zonas de matriz A/B/C/D.');
  if (!vigenciaValida(vigenteDesde, vigenteHasta)) throw new Error('Establece fechas de vigencia válidas.');
  if (base <= 0) throw new Error('El precio base debe ser mayor a cero.');
  let tarifas = [...(datos.tarifas ?? [])];
  for (const etapa of etapas) {
    if (!datos.etapas.some(e => e.codigo === etapa)) throw new Error('Etapa comercial inexistente.');
    for (const zona of zonas) {
      const valor = importeZona(zona, base, recargos);
      const anterior = tarifaDeZona(tarifas, etapa, moneda, zona);
      tarifas = actualizarTarifa(tarifas, {
        codigoZona: zona, codigoEtapa: etapa, moneda,
        tipoTarifa: 'MONTO_FIJO', valor, vigenteDesde,
        vigenteHasta
      });
      void anterior;
    }
  }
  if (tarifas.length > 2000) throw new Error('Se superó el máximo de tarifas.');
  return tarifas;
}
