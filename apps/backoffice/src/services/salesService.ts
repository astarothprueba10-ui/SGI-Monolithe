
import { supabase } from '../lib/supabase';
import type { Sale } from '../types';
import { crmBackend, type CrmOperacionItem } from './crmBackend';

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

function mapOperacion(row: CrmOperacionItem): Sale {
  const esVenta = row.tipo === 'VENTA';

   let modalidad: Sale['modality'] = undefined;

  if (esVenta && row.modalidad === 'CONTADO') {
    modalidad = 'Contado';
  } else if (esVenta && row.modalidad === 'FINANCIADA') {
    modalidad = 'Financiado';
  }

  return {
    id: `${row.tipo}-${row.id}`,
    code: row.codigo,
    type: esVenta ? 'Venta' : 'Separación',
    buyer: row.comprador ?? '',
    document: row.documento ?? '',
    lot: row.lote,
    project: row.proyecto,
    modality: modalidad,
    amount: Number(row.monto),
    advisor: row.asesor ?? '',
    date: row.fecha
      ? new Date(row.fecha).toLocaleDateString('es-PE', {
          timeZone: 'America/Lima'
        })
      : '',
    contract: esVenta
      ? (row.estado_contrato ?? undefined)
      : undefined,
    status: row.estado
  };
}

export const salesService = {
  async getSales(): Promise<Sale[]> {
    const operaciones: CrmOperacionItem[] = [];
    const tamano = 100;

    for (let pagina = 1; pagina <= 100; pagina++) {
      const respuesta = await crmBackend.listarOperaciones({
        pagina,
        tamano
      });

      if (!Array.isArray(respuesta.items)) {
        throw new Error(
          'Respuesta inválida del listado comercial.'
        );
      }

      operaciones.push(...respuesta.items);

      if (operaciones.length >= respuesta.total) {
        return operaciones.map(mapOperacion);
      }

      if (respuesta.items.length === 0) {
        break;
      }
    }

    throw new Error(
      'No se pudo cargar el listado comercial completo.'
    );
  },

  // Métodos heredados. Pendientes de migración a Core.
  async registerSeparation(input: RegisterSeparationInput) {
    const { data, error } = await supabase.rpc(
      'sp_registrar_separacion',
      {
        p_id_lote: input.lotId,
        p_id_persona: input.personaId,
        p_id_usuario: input.userId || 5,
        p_observaciones:
          input.notes || 'Separacion regular de lote S/ 500'
      }
    );

    if (error) throw new Error(error.message);

    if (data && data.success === false) {
      throw new Error(
        data.message || 'Error al registrar separacion'
      );
    }

    return data;
  },

  async formalizeCashSale(input: FormalizeCashInput) {
    const { data, error } = await supabase.rpc(
      'sp_formalizar_venta_contado',
      {
        p_id_lote: input.lotId,
        p_id_persona: input.personaId,
        p_id_asesor: input.advisorId || 4,
        p_monto_total: input.totalAmount,
        p_id_usuario: input.userId || 5,
        p_observaciones:
          input.notes || 'Venta al contado formalizada'
      }
    );

    if (error) throw new Error(error.message);

    if (data && data.success === false) {
      throw new Error(
        data.message || 'Error al formalizar venta al contado'
      );
    }

    return data;
  },

  async formalizeFinancedSale(input: FormalizeFinancedInput) {
    const { data, error } = await supabase.rpc(
      'sp_formalizar_venta_financiada',
      {
        p_id_lote: input.lotId,
        p_id_persona: input.personaId,
        p_id_asesor: input.advisorId || 4,
        p_monto_total: input.totalAmount,
        p_monto_inicial: input.downPayment,
        p_numero_cuotas: input.installmentsCount,
        p_id_usuario: input.userId || 5,
        p_observaciones:
          input.notes || 'Venta financiada formalizada'
      }
    );

    if (error) throw new Error(error.message);

    if (data && data.success === false) {
      throw new Error(
        data.message || 'Error al formalizar venta financiada'
      );
    }

    return data;
  },

  async expireOverdueReservations() {
    const { data, error } = await supabase.rpc(
      'sp_caducar_separaciones_vencidas'
    );

    if (error) throw new Error(error.message);

    return data;
  }
};
