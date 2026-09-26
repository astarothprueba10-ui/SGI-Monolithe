import { supabase } from '../lib/supabase';
import type { Installment, Voucher } from '../types';

export interface OverdueContractAlert {
  saleId: number;
  saleCode: string;
  lotCode: string;
  buyer: string;
  overdueCount: number;
  overdueAmount: number;
  applicableClause: boolean;
  contractStatus: string;
}

/**
 * Servicio de gestion de financiamiento, cuotas, semaforo de mora y vouchers.
 */
export const financingService = {
  /**
   * Lista el cronograma de cuotas con semaforo financiero para una venta.
   */
  async getInstallments(saleId: number): Promise<Installment[]> {
    const { data, error } = await supabase.rpc('sp_listar_cronograma_venta', {
      p_id_venta: saleId
    });

    if (error) {
      console.error('Error al listar cronograma:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id_cuota),
      saleCode: `VTA-${row.id_plan_pago}`,
      buyer: 'Alberto Morales Guerrero',
      number: `Cuota ${row.numero_cuota}`,
      dueDate: row.fecha_vencimiento ? new Date(row.fecha_vencimiento).toLocaleDateString('es-PE') : '',
      amount: Number(row.monto_cuota) || 0,
      paid: row.id_estado_cuota === 8 ? Number(row.monto_cuota) : 0,
      status: row.id_estado_cuota === 8 ? 'Pagado' : row.id_estado_cuota === 9 ? 'Vencido' : 'Pendiente'
    }));
  },

  /**
   * Obtiene la bandeja de vouchers para validacion de tesoreria.
   */
  async getVouchers(): Promise<Voucher[]> {
    const { data, error } = await supabase.rpc('sp_listar_vouchers_tesoreria');
    if (error) {
      console.error('Error al listar vouchers de tesoreria:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id_voucher),
      code: row.codigo_voucher,
      buyer: row.comprador,
      saleCode: row.codigo_venta || row.lote_codigo,
      bank: row.metodo_pago,
      amount: Number(row.monto) || 0,
      uploadedAt: row.fecha_carga ? new Date(row.fecha_carga).toLocaleDateString('es-PE') : '',
      status: row.estado_voucher === 'Aprobado' ? 'Aprobado' : row.estado_voucher === 'Rechazado' ? 'Rechazado' : 'En revisión'
    }));
  },

  /**
   * Valida o rechaza un voucher de pago y amortiza la cuota.
   */
  async validateVoucher(voucherId: number, action: 'APROBAR' | 'RECHAZAR', reason?: string) {
    const { data, error } = await supabase.rpc('sp_validar_voucher', {
      p_id_voucher: voucherId,
      p_accion: action,
      p_id_usuario: 3, // Usuario administrador
      p_motivo_rechazo: reason || null
    });

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Evalua la clausula resolutoria en cartera (3 o mas cuotas vencidas).
   */
  async evaluateResolutoryClause(): Promise<OverdueContractAlert[]> {
    const { data, error } = await supabase.rpc('sp_evaluar_clausula_resolutoria');
    if (error) {
      console.error('Error al evaluar clausula resolutoria:', error.message);
      return [];
    }

    return (data || []).map((r: any) => ({
      saleId: Number(r.id_venta),
      saleCode: r.codigo_venta,
      lotCode: r.lote_codigo,
      buyer: r.comprador,
      overdueCount: Number(r.cuotas_vencidas) || 0,
      overdueAmount: Number(r.monto_mora) || 0,
      applicableClause: Boolean(r.clausula_aplicable),
      contractStatus: r.estado_contrato
    }));
  },

  /**
   * Actualiza el semaforo de mora de cuotas en toda la cartera.
   */
  async updateInstallmentsOverdue() {
    const { data, error } = await supabase.rpc('sp_actualizar_estados_cuotas');
    if (error) throw new Error(error.message);
    return data;
  }
};
