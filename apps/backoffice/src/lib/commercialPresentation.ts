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

export function resumirPublicacion(filas: readonly PublicacionComercialFila[]) {
  return {
    preciosPreparados: filas.filter(f => f.situacion === 'HABILITADA').length,
    habilitarInventario: filas.filter(f => f.habilitarInventario).length,
    sinHabilitar: filas.filter(f => f.situacion === 'HABILITADA'
      && f.estadoInventario === 'NO_DISPONIBLE' && !f.habilitarInventario).length,
    yaDisponibles: filas.filter(f => f.estadoInventario === 'DISPONIBLE').length,
    bloqueados: filas.filter(f => f.situacion === 'BLOQUEADA').length,
    protegidos: filas.filter(f => f.situacion === 'PROTEGIDA').length,
    errores: filas.filter(f => f.situacion === 'ERROR').length
  };
}
