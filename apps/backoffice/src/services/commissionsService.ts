import { supabase } from '../lib/supabase';

export interface CommissionSettlement {
  id: string;
  code: string;
  saleCode: string;
  lotCode: string;
  advisorName: string;
  modality: string;
  salePrice: number;
  rate: number;
  amount: number;
  status: string;
  contractCode: string;
  contractStatus: string;
  generatedAt: string;
  approvedAt?: string;
}

export interface ManagerialKpis {
  totalLotes: number;
  lotesDisponibles: number;
  lotesReservados: number;
  lotesVendidos: number;
  totalVentas: number;
  totalRecaudado: number;
  saldoCartera: number;
  comisionesGeneradas: number;
  comisionesAprobadas: number;
}

export const commissionsService = {
  async getSettlements(): Promise<CommissionSettlement[]> {
    const { data, error } = await supabase.rpc('sp_listar_liquidaciones_asesores');
    if (error) {
      console.error('Error al listar liquidaciones:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id_comision),
      code: row.codigo_comision,
      saleCode: row.codigo_venta,
      lotCode: row.lote_codigo,
      advisorName: row.asesor_nombre,
      modality: row.modalidad,
      salePrice: Number(row.precio_venta) || 0,
      rate: Number(row.porcentaje_comision) || 0,
      amount: Number(row.monto_comision) || 0,
      status: row.estado_comision,
      contractCode: row.contrato_codigo || 'Sin contrato',
      contractStatus: row.contrato_estado || 'Pendiente',
      generatedAt: row.fecha_generacion ? new Date(row.fecha_generacion).toLocaleDateString('es-PE') : '',
      approvedAt: row.fecha_aprobacion ? new Date(row.fecha_aprobacion).toLocaleDateString('es-PE') : undefined
    }));
  },

  async calculateCommission(saleId: number, advisorId: number = 1) {
    const { data, error } = await supabase.rpc('sp_calcular_comision_venta', {
      p_id_venta: saleId,
      p_id_asesor: advisorId
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async approveCommission(commissionId: number, userId: number = 3) {
    const { data, error } = await supabase.rpc('sp_aprobar_devengo_comision', {
      p_id_comision: commissionId,
      p_id_usuario: userId
    });

    if (error) throw new Error(error.message);
    return data;
  },

  async getManagerialKpis(): Promise<ManagerialKpis | null> {
    const { data, error } = await supabase.rpc('sp_obtener_kpis_gerenciales');
    if (error) {
      console.error('Error al consultar KPIs gerenciales:', error.message);
      return null;
    }

    return {
      totalLotes: Number(data.total_lotes) || 0,
      lotesDisponibles: Number(data.lotes_disponibles) || 0,
      lotesReservados: Number(data.lotes_reservados) || 0,
      lotesVendidos: Number(data.lotes_vendidos) || 0,
      totalVentas: Number(data.total_ventas) || 0,
      totalRecaudado: Number(data.total_recaudado) || 0,
      saldoCartera: Number(data.saldo_cartera) || 0,
      comisionesGeneradas: Number(data.comisiones_generadas) || 0,
      comisionesAprobadas: Number(data.comisiones_aprobadas) || 0
    };
  }
};
