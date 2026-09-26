import { supabase } from '../lib/supabase';
import type { Lead } from '../types';

export interface Advisor {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  activeLeads: number;
}

export interface CreateLeadInput {
  names: string;
  paternalSurname: string;
  maternalSurname?: string;
  phone: string;
  email: string;
  sourceCode: string;
  interest: string;
  advisorId?: number;
  notes?: string;
}

export interface Visit {
  id: number;
  prospectId: number;
  prospectName: string;
  prospectPhone: string;
  advisorId: number;
  advisorName: string;
  projectName: string;
  date: string;
  shift: string;
  status: 'PROGRAMADA' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA' | 'REPROGRAMADA';
  meetingPoint: string;
  notes: string | null;
}

export interface ScheduleVisitInput {
  prospectId: number;
  advisorId: number;
  projectId?: number;
  visitDate: string;
  shift: '11:00' | '15:00';
  meetingPoint?: string;
  notes?: string;
}

interface RawProspecto {
  id_prospecto: number;
  codigo: string;
  id_persona: number;
  nombre_completo: string;
  telefono: string;
  email: string;
  id_origen: number;
  origen_codigo: string;
  origen_nombre: string;
  id_estado: number;
  estado_codigo: string;
  estado_nombre: string;
  interes: string;
  puntuacion: 'Alto' | 'Medio' | 'Bajo';
  id_asesor: number | null;
  asesor_nombre: string;
  fecha_registro: string;
  ultimo_contacto: string;
  observaciones: string | null;
}

interface RawAsesor {
  id_asesor: number;
  codigo: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  activo: boolean;
  leads_activos: string | number;
}

/**
 * Mapea la fila cruda de base de datos a la interfaz Lead del Backoffice.
 */
function mapRawToLead(raw: RawProspecto): Lead {
  const stageMap: Record<string, Lead['stage']> = {
    NUEVO: 'Nuevo',
    CONTACTADO: 'Contactado',
    EN_SEGUIMIENTO: 'Contactado',
    INTERESADO: 'Visita',
    NEGOCIACION: 'Negociación',
    CONVERTIDO: 'Convertido',
    NO_INTERESADO: 'Perdido',
    DESCARTADO: 'Perdido'
  };

  const sourceMap: Record<string, Lead['source']> = {
    FACEBOOK: 'Facebook',
    INSTAGRAM: 'Instagram',
    REFERIDO: 'Referido',
    FERIA: 'Feria',
    WEB: 'Web',
    WHATSAPP: 'WhatsApp'
  };

  return {
    id: raw.codigo,
    rawId: Number(raw.id_prospecto),
    name: raw.nombre_completo,
    phone: raw.telefono,
    email: raw.email,
    source: sourceMap[raw.origen_codigo] || 'Web',
    interest: raw.interes,
    stage: stageMap[raw.estado_codigo] || 'Nuevo',
    score: raw.puntuacion || 'Medio',
    advisor: raw.asesor_nombre,
    createdAt: new Date(raw.fecha_registro).toLocaleDateString('es-PE'),
    lastContact: raw.ultimo_contacto
  };
}

/**
 * Servicio de CRM para gestion de prospectos, embudo y asesores comerciales.
 */
export const crmService = {
  /**
   * Obtiene la lista completa de prospectos desde Supabase.
   */
  async getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase.rpc('sp_listar_prospectos');
    if (error) {
      console.error('Error al listar prospectos:', error);
      throw new Error(`Fallo consulta de prospectos: ${error.message}`);
    }
    return ((data as RawProspecto[]) || []).map(mapRawToLead);
  },

  /**
   * Obtiene la lista de asesores comerciales activos con su carga de leads.
   */
  async getAdvisors(): Promise<Advisor[]> {
    const { data, error } = await supabase.rpc('sp_listar_asesores');
    if (error) {
      console.error('Error al listar asesores:', error);
      throw new Error(`Fallo consulta de asesores: ${error.message}`);
    }
    return ((data as RawAsesor[]) || []).map((r) => ({
      id: Number(r.id_asesor),
      code: r.codigo,
      name: r.nombre_completo,
      email: r.email,
      phone: r.telefono,
      active: r.activo,
      activeLeads: Number(r.leads_activos)
    }));
  },

  /**
   * Asigna un prospecto a un asesor comercial.
   */
  async assignLead(prospectId: number, advisorId: number, reason = 'Asignacion manual'): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_asignar_prospecto_asesor', {
      p_id_prospecto: prospectId,
      p_id_asesor: advisorId,
      p_motivo: reason
    });
    if (error) {
      console.error('Error al asignar prospecto:', error);
      throw new Error(`Fallo asignacion de prospecto: ${error.message}`);
    }
    return Boolean(data?.success);
  },

  /**
   * Modifica la etapa del embudo comercial para un prospecto.
   */
  async updateLeadStage(prospectId: number, stageId: number, note?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_cambiar_etapa_prospecto', {
      p_id_prospecto: prospectId,
      p_id_estado: stageId,
      p_observacion: note || null
    });
    if (error) {
      console.error('Error al actualizar etapa de prospecto:', error);
      throw new Error(`Fallo actualizacion de etapa: ${error.message}`);
    }
    return Boolean(data?.success);
  },

  /**
   * Crea un nuevo prospecto y lo registra en el embudo comercial.
   */
  async createLead(input: CreateLeadInput): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_crear_prospecto', {
      p_nombres: input.names,
      p_apellido_paterno: input.paternalSurname,
      p_apellido_materno: input.maternalSurname || '',
      p_telefono: input.phone,
      p_email: input.email,
      p_origen_codigo: input.sourceCode,
      p_interes: input.interest,
      p_id_asesor: input.advisorId || null,
      p_observaciones: input.notes || null
    });
    if (error) {
      console.error('Error al registrar prospecto:', error);
      throw new Error(`Fallo creacion de prospecto: ${error.message}`);
    }
    return Boolean(data?.success);
  },

  /**
   * Obtiene la lista completa de visitas guiadas programadas.
   */
  async getVisits(): Promise<Visit[]> {
    const { data, error } = await supabase.rpc('sp_listar_visitas');
    if (error) {
      console.error('Error al listar visitas:', error);
      throw new Error(`Fallo consulta de visitas: ${error.message}`);
    }
    return ((data as any[]) || []).map((r) => ({
      id: Number(r.id_visita),
      prospectId: Number(r.id_prospecto),
      prospectName: r.prospecto_nombre,
      prospectPhone: r.prospecto_telefono,
      advisorId: Number(r.id_asesor),
      advisorName: r.asesor_nombre,
      projectName: r.proyecto_nombre,
      date: new Date(r.fecha_visita).toLocaleDateString('es-PE'),
      shift: r.turno,
      status: r.estado,
      meetingPoint: r.punto_encuentro,
      notes: r.observaciones
    }));
  },

  /**
   * Agenda una nueva visita guiada con validacion oficial de dias y turnos.
   */
  async scheduleVisit(input: ScheduleVisitInput): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_agendar_visita', {
      p_id_prospecto: input.prospectId,
      p_id_asesor: input.advisorId,
      p_id_proyecto: input.projectId || 2,
      p_fecha_visita: input.visitDate,
      p_turno: input.shift,
      p_punto_encuentro: input.meetingPoint || 'Oficina de Ventas - Lurin',
      p_observaciones: input.notes || null
    });
    if (error) {
      console.error('Error al agendar visita:', error);
      throw new Error(`Fallo al agendar visita: ${error.message}`);
    }
    return Boolean(data?.success);
  },

  /**
   * Confirma la asistencia de un prospecto a una visita guiada.
   */
  async confirmVisit(visitId: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_confirmar_visita', { p_id_visita: visitId });
    if (error) {
      console.error('Error al confirmar visita:', error);
      throw new Error(`Fallo confirmacion de visita: ${error.message}`);
    }
    return Boolean(data?.success);
  },

  /**
   * Cancela una visita guiada registrando el motivo.
   */
  async cancelVisit(visitId: number, reason?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('sp_cancelar_visita', {
      p_id_visita: visitId,
      p_motivo: reason || 'Cancelada por cliente'
    });
    if (error) {
      console.error('Error al cancelar visita:', error);
      throw new Error(`Fallo cancelacion de visita: ${error.message}`);
    }
    return Boolean(data?.success);
  }
};
