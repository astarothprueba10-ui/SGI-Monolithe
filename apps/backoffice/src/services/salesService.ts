import { supabase } from '../lib/supabase';
import type { Sale } from '../types';

export interface RegisterSeparationInput {
  lotId: number;
  personaId: number;
  userId?: number;
  notes?: string;
}

export interface FormalizeCashInput {
  lotId: number;
  personaId: number;
  advisorId?: number;
  userId?: number;
  totalAmount: number;
  notes?: string;
}

export interface FormalizeFinancedInput {
  lotId: number;
  personaId: number;
  advisorId?: number;
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

function mapSaleRow(row: any): Sale {
  return {
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
  };
}

function mapReservationRow(row: any): Sale {
  const p = row.core_personas;
  const l = row.inm_lotes;
  const buyerName = p ? `${p.nombres} ${p.apellido_paterno}`.trim() : 'Comprador reservado';
  const lotCode = l ? l.codigo : 'Lote';
  const isOverdue = row.id_estado_reserva === 9 || (row.fecha_vencimiento && new Date(row.fecha_vencimiento) < new Date());
  return {
    id: String(row.id_reserva),
    code: row.codigo,
    type: 'Separación',
    buyer: buyerName,
    document: 'DNI / Reserva',
    lot: lotCode,
    project: 'Condominio Campestre Los Cocos',
    modality: 'Contado',
    amount: Number(row.monto_reserva) || 500,
    advisor: 'Carlos Mendoza',
    date: row.fecha_reserva ? new Date(row.fecha_reserva).toLocaleDateString('es-PE') : '',
    contract: isOverdue ? 'Vencida' : 'Vigente',
    status: isOverdue ? 'Rechazado' : 'Pendiente'
  };
}

export const salesService = {
  async getSales(): Promise<Sale[]> {
    const { data: salesData, error: salesError } = await supabase.rpc('sp_listar_ventas');
    if (salesError) {
      console.error('Error al consultar sp_listar_ventas:', salesError.message);
    }

    const { data: resData, error: resError } = await supabase
      .from('ven_reservas')
      .select('id_reserva, codigo, monto_reserva, fecha_reserva, fecha_vencimiento, id_estado_reserva, inm_lotes(id_lote, codigo), core_personas(id_persona, nombres, apellido_paterno)')
      .order('id_reserva', { ascending: false });

    if (resError) {
      console.error('Error al consultar ven_reservas:', resError.message);
    }

    const salesList = (salesData || []).map(mapSaleRow);
    const reservationsList = (resData || []).map(mapReservationRow);
    return [...salesList, ...reservationsList];
  },

  async registerSeparation(input: RegisterSeparationInput) {
    const { data, error } = await supabase.rpc('sp_registrar_separacion', {
      p_id_lote: input.lotId,
      p_id_persona: input.personaId,
      p_id_usuario: input.userId || 5,
      p_observaciones: input.notes || 'Separacion regular de lote S/ 500'
    });

    if (error) throw new Error(error.message);
    if (data && data.success === false) throw new Error(data.message || 'Error al registrar separacion');
    return data;
  },

  async formalizeCashSale(input: FormalizeCashInput) {
    const { data, error } = await supabase.rpc('sp_formalizar_venta_contado', {
      p_id_lote: input.lotId,
      p_id_persona: input.personaId,
      p_id_asesor: input.advisorId || 4,
      p_monto_total: input.totalAmount,
      p_id_usuario: input.userId || 5,
      p_observaciones: input.notes || 'Venta al contado formalizada'
    });

    if (error) throw new Error(error.message);
    if (data && data.success === false) throw new Error(data.message || 'Error al formalizar venta al contado');
    return data;
  },

  async formalizeFinancedSale(input: FormalizeFinancedInput) {
    const { data, error } = await supabase.rpc('sp_formalizar_venta_financiada', {
      p_id_lote: input.lotId,
      p_id_persona: input.personaId,
      p_id_asesor: input.advisorId || 4,
      p_monto_total: input.totalAmount,
      p_monto_inicial: input.downPayment,
      p_numero_cuotas: input.installmentsCount,
      p_id_usuario: input.userId || 5,
      p_observaciones: input.notes || 'Venta financiada formalizada'
    });

    if (error) throw new Error(error.message);
    if (data && data.success === false) throw new Error(data.message || 'Error al formalizar venta financiada');
    return data;
  },

  async expireOverdueReservations() {
    const { data, error } = await supabase.rpc('sp_caducar_separaciones_vencidas');
    if (error) throw new Error(error.message);
    return data;
  }
};
