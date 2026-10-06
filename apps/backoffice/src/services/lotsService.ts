import { coreService } from './coreService';
import { supabase } from '../lib/supabase';
import type { Lot, LotStatus, Project } from '../types';

export const lotsService = {
  async getLots(projectId?: number): Promise<Lot[]> {
    const rawLots = await coreService.searchLots({
      idProyecto: projectId || undefined
    });

    return rawLots.map((r) => {
      const area = r.areaM2 ? Number(r.areaM2) : 90;
      const colNum = parseInt(r.numero || '1', 10) || 1;
      const blockLetter = (r.nombreManzana || 'Manzana A').split(' ')[1] || 'A';
      const rowNum = blockLetter.charCodeAt(0) - 64;

      let status: LotStatus = 'Disponible';
      if (r.codigoEstadoLote === 'RESERVADO' || r.codigoEstadoLote === 'SEPARADO') {
        status = 'Separado';
      } else if (r.codigoEstadoLote === 'VENDIDO') {
        status = 'Vendido';
      }

      return {
        id: String(r.idLote),
        code: r.codigo,
        projectId: String(r.idProyecto || projectId || 1),
        stage: r.nombreEtapa || 'Etapa 1',
        block: r.nombreManzana || 'Mz A',
        type: (r.nombreTipoLote as any) || 'Residencial',
        area,
        pricePerM2: 500,
        price: area * 500,
        status,
        row: rowNum > 0 ? rowNum : 1,
        col: colNum
      };
    });
  },

  async getProjects(): Promise<Project[]> {
    const rawProjects = await coreService.getProjects();

    return rawProjects.map((p) => ({
      id: String(p.idProyecto),
      name: p.nombre,
      district: p.distrito ? `${p.distrito}, ${p.provincia || 'Lima'}` : 'Lima',
      stages: 1,
      blocks: 1,
      totalLots: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      priceFrom: 0,
      status: p.activo ? 'Activo' : 'Inactivo'
    }));
  },

  async reserveLot(lotId: number, personaId: number, userId?: number, notes?: string) {
    return await supabase.rpc('sp_registrar_separacion', {
      p_id_lote: lotId,
      p_id_persona: personaId,
      p_id_usuario: userId || null,
      p_observaciones: notes || 'Separacion registrada desde Backoffice'
    });
  },

  async updateLotStatus(lotId: number, newStatus: string, userId?: number, reason?: string) {
    return await supabase.rpc('sp_cambiar_estado_lote', {
      p_id_lote: lotId,
      p_codigo_nuevo_estado: newStatus,
      p_id_usuario: userId || null,
      p_motivo: reason || 'Actualizacion desde Backoffice'
    });
  }
};
