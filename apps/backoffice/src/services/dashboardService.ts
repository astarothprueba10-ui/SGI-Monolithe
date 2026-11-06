import { supabase } from '../lib/supabase';
import type { ManagerialKpis } from './commissionsService';

export interface DashboardProjectItem {
  id: string | number;
  name: string;
  totalLots: number;
  sold: number;
  reserved: number;
  available: number;
}

export interface DashboardMonthlyTrendItem {
  month: string;
  separaciones: number;
  ventas: number;
}

export interface DashboardActivityItem {
  id: string;
  user: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  module: string;
}

export interface DashboardPendingCounts {
  vouchers_por_validar: number;
  cuotas_vencidas: number;
  separaciones_por_vencer: number;
  leads_sin_asignar: number;
  comisiones_por_aprobar: number;
}

export interface DashboardSummary {
  kpis: ManagerialKpis & {
    clientesActivos: number;
    cuotasVencidasMonto: number;
    cuotasVencidasCantidad: number;
  };
  operacionesPendientes: DashboardPendingCounts;
  proyectos: DashboardProjectItem[];
  tendenciaMensual: DashboardMonthlyTrendItem[];
  actividadReciente: DashboardActivityItem[];
}

function parseKpis(raw: Record<string, unknown>): DashboardSummary['kpis'] {
  return {
    totalLotes: Number(raw.total_lotes) || 0,
    lotesDisponibles: Number(raw.lotes_disponibles) || 0,
    lotesReservados: Number(raw.lotes_reservados) || 0,
    lotesVendidos: Number(raw.lotes_vendidos) || 0,
    totalVentas: Number(raw.total_ventas) || 0,
    totalRecaudado: Number(raw.total_recaudado) || 0,
    saldoCartera: Number(raw.saldo_cartera) || 0,
    comisionesGeneradas: Number(raw.comisiones_generadas) || 0,
    comisionesAprobadas: Number(raw.comisiones_aprobadas) || 0,
    clientesActivos: Number(raw.clientes_activos) || 0,
    cuotasVencidasMonto: Number(raw.cuotas_vencidas_monto) || 0,
    cuotasVencidasCantidad: Number(raw.cuotas_vencidas_cantidad) || 0
  };
}

function parseProjects(rawList: Array<Record<string, unknown>>): DashboardProjectItem[] {
  return rawList.map((p) => ({
    id: String(p.id_proyecto),
    name: String(p.nombre ?? 'Proyecto'),
    totalLots: Number(p.total_lotes) || 0,
    sold: Number(p.vendidos) || 0,
    reserved: Number(p.reservados) || 0,
    available: Number(p.disponibles) || 0
  }));
}

function parseTrends(rawList: Array<Record<string, unknown>>): DashboardMonthlyTrendItem[] {
  return rawList.map((t) => ({
    month: String(t.mes ?? ''),
    separaciones: Number(t.separaciones) || 0,
    ventas: Number(t.ventas) || 0
  }));
}

function parseActivity(rawList: Array<Record<string, unknown>>): DashboardActivityItem[] {
  return rawList.map((a) => ({
    id: `AC-${a.id}`,
    user: String(a.user ?? 'Sistema'),
    initials: String(a.initials ?? 'SI'),
    action: String(a.action ?? ''),
    target: String(a.target ?? ''),
    module: String(a.module ?? 'General'),
    time: String(a.time ?? '')
  }));
}

export const dashboardService = {
  /**
   * Obtiene de forma atomica todos los indicadores, operaciones,
   * mezcla de proyectos, tendencia y actividad reciente del dashboard.
   */
  async getDashboardSummary(): Promise<DashboardSummary | null> {
    const { data, error } = await supabase.rpc('sp_obtener_dashboard_resumen');
    if (error) {
      console.warn('No se pudo cargar el resumen integral del dashboard:', error.message);
      return null;
    }
    if (!data || typeof data !== 'object') return null;

    return {
      kpis: parseKpis((data.kpis ?? {}) as Record<string, unknown>),
      operacionesPendientes: (data.operaciones_pendientes ?? {}) as DashboardPendingCounts,
      proyectos: parseProjects((data.proyectos ?? []) as Array<Record<string, unknown>>),
      tendenciaMensual: parseTrends((data.tendencia_mensual ?? []) as Array<Record<string, unknown>>),
      actividadReciente: parseActivity((data.actividad_reciente ?? []) as Array<Record<string, unknown>>)
    };
  }
};

