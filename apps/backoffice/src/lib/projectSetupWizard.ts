import type { ConfiguracionProyectoResponse, PublicacionComercialFila } from '../types/projectConfiguration';
import { validarConfiguracion } from './projectConfiguration';

export const PASOS_CONFIGURACION = ['Origen de datos', 'Etapas comerciales', 'Manzanas y lotes',
  'Matriz de tarifas', 'Disponibilidad', 'Finalizar'] as const;

export function validarPasoInicial(paso: number, config: ConfiguracionProyectoResponse): string | null {
  const { datos, lotes } = config;
  if (paso === 1) {
    if (!datos.etapas.length) return 'Crea al menos una etapa comercial para continuar.';
    return validarConfiguracion(datos);
  }
  if (paso === 2) {
    if (!lotes.length) return 'Registra los lotes del proyecto desde la importación o los formularios de Zonas, Manzanas y Lotes.';
    const etapas = new Set(datos.etapas.map(e => e.codigo));
    const porLote = new Map(datos.lotes.map(a => [a.id, a.codigoEtapa]));
    const porManzana = new Map(datos.manzanas.map(a => [a.id, a.codigoEtapa]));
    const pendientes = lotes.filter(l => !['RESERVADO','VENDIDO'].includes(l.estadoInventario ?? '')
      && !etapas.has(porLote.get(l.id) ?? porManzana.get(l.idManzana) ?? ''));
    if (pendientes.length) return `${pendientes.length} lote(s) sin etapa comercial. Asigna su manzana o el lote individual: ${pendientes.slice(0, 5).map(l => l.codigo).join(', ')}${pendientes.length > 5 ? '…' : ''}.`;
    return validarConfiguracion(datos);
  }
  if (paso === 3) {
    return validarConfiguracion(datos);
  }
  return null;
}

export function agruparIncidencias(filas: readonly PublicacionComercialFila[]) {
  const grupos = new Map<string, string[]>();
  for (const f of filas) {
    if (f.situacion !== 'ERROR') continue;
    const codigos = grupos.get(f.mensaje) ?? [];
    codigos.push(f.codigo);
    grupos.set(f.mensaje, codigos);
  }
  return Array.from(grupos, ([mensaje, lotes]) => ({ mensaje, lotes }));
}

export function filtrarSeleccion(codigos: readonly string[], config: ConfiguracionProyectoResponse): string[] {
  const existentes = new Set(config.datos.etapas.map(e => e.codigo));
  return [...new Set(codigos)].filter(c => existentes.has(c));
}
