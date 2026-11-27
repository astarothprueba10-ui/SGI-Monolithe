import type { ConfiguracionProyectoResponse, PublicacionComercialFila } from '../types/projectConfiguration';

export function estadoInventarioLegible(codigo: string): string {
  const nombres: Record<string, string> = {
    NO_DISPONIBLE: 'No habilitado para ventas',
    DISPONIBLE: 'Disponible en inventario',
    RESERVADO: 'Reservado',
    VENDIDO: 'Vendido',
    BLOQUEADO: 'Bloqueado en inventario'
  };
  return nombres[codigo] ?? codigo.replace(/_/g, ' ').toLowerCase();
}

export function condicionComercialLegible(codigo: string | null): string {
  const nombres: Record<string, string> = {
    PROMOCION: 'Precio promocional',
    REGULAR: 'Precio regular',
    ANTICIPADA: 'Precio regular',
    BLOQUEADA: 'Bloqueada comercialmente'
  };
  return codigo ? nombres[codigo] ?? codigo.replace(/_/g, ' ') : 'Sin etapa asignada';
}

export function contarLotesPorEtapa(config: ConfiguracionProyectoResponse, codigo: string): number {
  const asignacionesLote = new Map(config.datos.lotes.map(a => [a.id, a.codigoEtapa]));
  const asignacionesManzana = new Map(config.datos.manzanas.map(a => [a.id, a.codigoEtapa]));
  return config.lotes.filter(l =>
    (asignacionesLote.get(l.id) ?? asignacionesManzana.get(l.idManzana)) === codigo).length;
}

export function inventarioPorEtapa(config: ConfiguracionProyectoResponse, codigo: string) {
  const lotes = new Map(config.datos.lotes.map(a => [a.id,a.codigoEtapa]));
  const manzanas = new Map(config.datos.manzanas.map(a => [a.id,a.codigoEtapa]));
  const asignados = config.lotes.filter(l => (lotes.get(l.id) ?? manzanas.get(l.idManzana)) === codigo);
  return { total: asignados.length, disponibles: asignados.filter(l => l.estadoInventario === 'DISPONIBLE').length,
    protegidos: asignados.filter(l => ['VENDIDO','RESERVADO'].includes(l.estadoInventario ?? '')).length };
}

export function seleccionInicial(config: ConfiguracionProyectoResponse): string[] {
  return config.datos.etapas.filter(e => e.disponibilidad !== 'BLOQUEADA' && inventarioPorEtapa(config,e.codigo).disponibles > 0).map(e => e.codigo);
}

export function resumirPublicacion(filas: readonly PublicacionComercialFila[]) {
  return {
    preciosPreparados: filas.filter(f => f.situacion === 'HABILITADA' || (f.situacion === 'BLOQUEADA' && f.precioFinal != null)).length,
    habilitarInventario: filas.filter(f => f.habilitarInventario).length,
    sinHabilitar: filas.filter(f => f.situacion === 'HABILITADA'
      && f.estadoInventario === 'NO_DISPONIBLE' && !f.habilitarInventario).length,
    yaDisponibles: filas.filter(f => f.estadoInventario === 'DISPONIBLE').length,
    bloqueados: filas.filter(f => f.situacion === 'BLOQUEADA').length,
    protegidos: filas.filter(f => f.situacion === 'PROTEGIDA').length,
    errores: filas.filter(f => f.situacion === 'ERROR').length
  };
}
