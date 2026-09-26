import { supabase } from '../lib/supabase';
import type { Sale } from '../types';

export interface FormalizeCashInput {
  lotId: number;
  personaId: number;
  userId?: number;
  totalAmount: number;
  notes?: string;
}

export interface FormalizeFinancedInput {
  lotId: number;
  personaId: number;
  userId?: number;
  totalAmount: number;
  downPayment: number;
  installmentsCount: number;
  notes?: string;
}

export interface SalesFilter {
  query?: string;
  modality?: string;
  tab?: 'todas' | 'Separación' | 'Venta';
}

/**
 * Servicio de gestion de ventas, separaciones y contratos.
 */
export const salesService = {
  /**
   * Obtiene la lista unificada de ventas y separaciones formalizadas.
   */
  async getSales(): Promise<Sale[]> {
    const { data, error } = await supabase.rpc('sp_listar_ventas');
    if (error) {
      console.error('Error al consultar sp_listar_ventas:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id_venta),
      code: row.codigo,
      type: 'Venta',
      buyer: row.comprador,
      document: row.documento,
      lot: row.lote_codigo,
      project: row.proyecto_nombre,
      modality: row.modalidad === 'Financiada' ? 'Financiado' : 'Contado',
      amount: Number(row.monto_total) || 0,
      advisor: row.asesor_nombre,
      date: row.fecha_venta ? new Date(row.fecha_venta).toLocaleDateString('es-PE') : '',
      contract: row.contrato_estado === 'Vigente' ? 'Firmado' : 'Pendiente',
      status: 'Aprobado' as const
    }));
  },

  /**
   * Formaliza una venta al contado con minuta de compraventa.
   */
  async formalizeCashSale(input: FormalizeCashInput) {
    const { data, error } = await supabase.rpc('sp_formalizar_venta_contado', {
      p_id_lote: input.lotId,
      p_id_persona: input.personaId,
      p_id_usuario: input.userId || 1,
      p_monto_total: input.totalAmount,
      p_id_moneda: 3,
      p_observaciones: input.notes || 'Venta al contado formalizada'
    });

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Formaliza una venta financiada generando cronograma y contrato.
   */
  async formalizeFinancedSale(input: FormalizeFinancedInput) {
    const { data, error } = await supabase.rpc('sp_formalizar_venta_financiada', {
      p_id_lote: input.lotId,
      p_id_persona: input.personaId,
      p_id_usuario: input.userId || 1,
      p_monto_total: input.totalAmount,
      p_monto_inicial: input.downPayment,
      p_numero_cuotas: input.installmentsCount,
      p_id_moneda: 3,
      p_observaciones: input.notes || 'Venta financiada formalizada'
    });

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Ejecuta el control de caducidad para revertir separaciones mayores a 7 dias.
   */
  async expireOverdueReservations() {
    const { data, error } = await supabase.rpc('sp_caducar_separaciones_vencidas');
    if (error) throw new Error(error.message);
    return data;
  }
};
