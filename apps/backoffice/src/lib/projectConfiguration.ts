import type { AsignacionComercial, ConfiguracionComercial, ReglaEtapaComercial } from '../types/projectConfiguration';

// ANTICIPADA se conserva únicamente para leer borradores antiguos.
export function condicionPrecio(codigo: ReglaEtapaComercial['disponibilidad']): 'REGULAR' | 'PROMOCION' {
  return codigo === 'PROMOCION' ? 'PROMOCION' : 'REGULAR';
}

export function sugerirCodigoEtapa(etapas: ReglaEtapaComercial[]): string {
  const primera = etapas.map(e => e.codigo.match(/^(.+?)(\d+)$/)).find(m => m !== null);
  const prefijo = primera?.[1] ?? 'COM-';
  const ancho = primera?.[2].length ?? 2;
  const numeros = etapas.map(e => e.codigo.startsWith(prefijo) ? e.codigo.slice(prefijo.length) : '').filter(n => /^\d+$/.test(n)).map(Number).filter(Number.isSafeInteger);
  let siguiente = Math.max(0, ...numeros) + 1;
  if (!Number.isSafeInteger(siguiente)) return 'COM-01';
  let codigo = prefijo + String(siguiente).padStart(ancho, '0');
  while (etapas.some(e => e.codigo === codigo)) codigo = prefijo + String(++siguiente).padStart(ancho, '0');
  return codigo.length <= 30 ? codigo : 'COM-01';
}
export function nuevaEtapa(_etapas: ReglaEtapaComercial[]): ReglaEtapaComercial {
  return { codigo: '', nombre: '', disponibilidad: 'REGULAR', tipoDescuento: 'NINGUNO', descuento: 0 };
}

export function asignar(filas: AsignacionComercial[], id: number, codigoEtapa: string): AsignacionComercial[] {
  const otras = filas.filter(f => f.id !== id);
  return codigoEtapa ? [...otras, { id, codigoEtapa }] : otras;
}

export function asignacion(filas: AsignacionComercial[], id: number): string {
  return filas.find(f => f.id === id)?.codigoEtapa ?? '';
}

export function actualizarEtapa(datos: ConfiguracionComercial, index: number, cambio: Partial<ReglaEtapaComercial>) {
  const anterior = datos.etapas[index];
  const etapa = { ...anterior, ...cambio };
  if (datos.etapas.some((e, i) => i !== index && e.codigo === etapa.codigo)) return datos;
  if (etapa.disponibilidad !== 'PROMOCION') {
    etapa.tipoDescuento = 'NINGUNO';
    etapa.descuento = 0;
  }
  if (etapa.tipoDescuento === 'NINGUNO') etapa.descuento = 0;
  const reemplazar = (filas: AsignacionComercial[]) =>
    filas.map(f => f.codigoEtapa === anterior.codigo ? { ...f, codigoEtapa: etapa.codigo } : f);
  return { ...datos, tarifas: (datos.tarifas ?? []).map(t => t.codigoEtapa === anterior.codigo ? { ...t, codigoEtapa: etapa.codigo } : t), etapas: datos.etapas.map((e, i) => i === index ? etapa : e),
    manzanas: reemplazar(datos.manzanas), lotes: reemplazar(datos.lotes) };
}

export function etapaEnUso(datos: ConfiguracionComercial, codigo: string): boolean {
  return [...datos.manzanas, ...datos.lotes, ...(datos.tarifas ?? [])].some(f => f.codigoEtapa === codigo);
}

export function validarConfiguracion(datos: ConfiguracionComercial): string | null {
  const codigos = datos.etapas.map(e => e.codigo);
  if (new Set(codigos).size !== codigos.length) return 'No se permiten códigos de etapa duplicados.';
  for (const e of datos.etapas) {
    if (!/^[A-Z0-9][A-Z0-9_-]{0,29}$/.test(e.codigo) || !e.nombre.trim()) return 'Revisa el código y nombre de cada etapa.';
    if (!Number.isFinite(e.descuento) || e.descuento < 0 || e.descuento > 999999999999.99)
      return 'El descuento debe ser un importe válido.';
    if (e.disponibilidad === 'PROMOCION' && e.tipoDescuento === 'NINGUNO') return 'Configura el descuento de la etapa promocional.';
    if (e.tipoDescuento !== 'NINGUNO' && e.descuento <= 0) return 'Ingresa el descuento de la promoción.';
    if (e.tipoDescuento === 'PORCENTAJE' && e.descuento >= 100) return 'El porcentaje debe ser inferior al 100%.';
  }
  if ([...datos.manzanas, ...datos.lotes].some(f => !codigos.includes(f.codigoEtapa))) return 'Hay asignaciones con etapas inexistentes.';
  const claves = new Set<string>();
  for (const tarifa of datos.tarifas ?? []) {
    const clave = [tarifa.codigoZona, tarifa.codigoEtapa, tarifa.moneda].join('|');
    if (claves.has(clave)) return 'Solo se admite una tarifa por zona, etapa y moneda.';
    claves.add(clave);
    if (!tarifa.codigoZona || !codigos.includes(tarifa.codigoEtapa) || !tarifa.moneda)
      return 'Completa las referencias de la tarifa.';
    if (!Number.isFinite(tarifa.valor) || tarifa.valor <= 0 || tarifa.valor > 9999999999.9999)
      return 'La tarifa debe ser mayor a cero y tener un valor válido.';
    if (!tarifa.vigenteDesde || (tarifa.vigenteHasta && tarifa.vigenteHasta < tarifa.vigenteDesde))
      return 'Revisa las fechas de vigencia de las tarifas.';
  }
  return null;
}
