import { supabase } from '../lib/supabase';
import type { Lot, LotStatus, Project } from '../types';

/**
 * Servicio para consultar y gestionar lotes y proyectos desde Supabase.
 */
export const lotsService = {
  /**
   * Obtiene la lista completa de lotes para el plano interactivo y catalogo.
   */
  async getLots(projectId?: number): Promise<Lot[]> {
    const { data, error } = await supabase.rpc('sp_listar_lotes_plano', {
      p_id_proyecto: projectId || null
    });

    if (error) {
      console.error('Error al consultar sp_listar_lotes_plano:', error.message);
      return [];
    }

    return (data || []).map((r: any) => {
      const area = Number(r.area_m2) || 90;
      const price = Number(r.precio_base) || 0;
      const blockLetter = r.manzana_nombre?.split(' ')[1] || 'A';
      const colNum = parseInt(r.numero_lote, 10) || 1;
      const rowNum = blockLetter.charCodeAt(0) - 64; // A=1, B=2, C=3...

      let status: LotStatus = 'Disponible';
      if (r.estado_codigo === 'RESERVADO' || r.estado_codigo === 'SEPARADO') {
        status = 'Separado';
      } else if (r.estado_codigo === 'VENDIDO') {
        status = 'Vendido';
      }

      return {
        id: String(r.id_lote),
        code: r.codigo_lote,
        projectId: String(r.id_proyecto),
        stage: 'Etapa 1',
        block: r.manzana_nombre,
        type: colNum === 1 || colNum === 10 ? 'Esquina' : colNum === 5 ? 'Parque' : 'Residencial',
        area,
        pricePerM2: area > 0 ? Math.round(price / area) : 500,
        price,
        status,
        row: rowNum,
        col: colNum
      };
    });
  },

  /**
   * Obtiene la lista de proyectos inmobiliarios activos.
   */
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('inm_proyectos')
      .select('id_proyecto, codigo, nombre, distrito, area_total_m2, activo')
      .eq('activo', true)
      .limit(10);

    if (error) {
      console.error('Error al consultar inm_proyectos:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: String(p.id_proyecto),
      name: p.nombre,
      district: `${p.distrito}, Lima`,
      stages: 1,
      blocks: 7,
      totalLots: 70,
      available: 70,
      reserved: 0,
      sold: 0,
      priceFrom: 49000,
      status: 'Activo' as const
    }));
  },

  /**
   * Registra una separacion oficial de S/ 500 con plazo de 7 dias calendario.
   */
  async reserveLot(lotId: number, personaId: number, userId?: number, notes?: string) {
    return await supabase.rpc('sp_registrar_separacion', {
      p_id_lote: lotId,
      p_id_persona: personaId,
      p_id_usuario: userId || null,
      p_observaciones: notes || 'Separacion registrada desde Backoffice'
    });
  },

  /**
   * Cambia el estado de un lote registrando la transicion en el historial.
   */
  async updateLotStatus(lotId: number, newStatus: string, userId?: number, reason?: string) {
    return await supabase.rpc('sp_cambiar_estado_lote', {
      p_id_lote: lotId,
      p_codigo_nuevo_estado: newStatus,
      p_id_usuario: userId || null,
      p_motivo: reason || 'Actualizacion desde Backoffice'
    });
  }
};
