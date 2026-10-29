import { coreApi } from '../lib/apiClient';
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

type CommissionRow = {
  id_comision: number;
  codigo_comision: string;
  codigo_venta: string;
  lote_codigo: string;
  asesor_nombre: string;
  modalidad: string;
  precio_venta: number | string;
  porcentaje_comision: number | string;
  monto_comision: number | string;
  estado_comision: string;
  contrato_codigo: string | null;
  contrato_estado: string | null;
  fecha_generacion: string | null;
  fecha_aprobacion: string | null;
};

export const commissionsService = {
  // Autorizacion desde JWT en Core Service + comprobacion de permisos vigentes en BD.
  // No usa RPC de Supabase en el navegador para listar comisiones.
  async getSettlements(): Promise<CommissionSettlement[]> {
    const data = await coreApi.get<CommissionRow[]>('/crm/comisiones');
    return data.map((row) => ({
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

  // El actor se toma exclusivamente del JWT, nunca de un ID predeterminado del frontend.
  async approveCommission(commissionId: number): Promise<{ success: boolean; mensaje: string }> {
    return coreApi.post<{ success: boolean; mensaje: string }>(
      `/crm/comisiones/${commissionId}/aprobar`, {}
    );
  },

  // Se conserva la funcionalidad ajena a esta pantalla para no afectar otros modulos.
  // Pendiente de pasar tambien este calculo al backend autenticado.
  async calculateCommission(saleId: number, advisorId: number = 1) {
    const { data, error } = await supabase.rpc('sp_calcular_comision_venta', {
      p_id_venta: saleId,
      p_id_asesor: advisorId
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
