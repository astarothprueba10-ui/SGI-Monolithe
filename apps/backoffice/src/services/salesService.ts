
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

};
