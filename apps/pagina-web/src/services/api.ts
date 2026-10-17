import type { CaptacionDatos } from '../lib/captacion';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

export interface ConsultaPayload extends CaptacionDatos {
  idSolicitud: string; idPagina?: number; aceptaPrivacidad: boolean;
}

export interface ConsultaResponse {
  idConsulta: number;
  codigo: string;
  nombre: string;
  correo?: string;
  telefono?: string;
  idProyecto?: number;
  fechaRecepcion: string;
  mensaje: string;
}

export interface PaginaDto {
  idPagina: number;
  idEstado: number;
  codigo: string;
  ruta: string;
  titulo: string;
  descripcion?: string;
  tituloSeo?: string;
  descripcionSeo?: string;
  orden: number;
  mostrarMenu: boolean;
  activo: boolean;
}

export interface ProyectoDto {
  idProyecto: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  ubicacionReferencia?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  areaTotal?: number;
  latitud?: number;
  longitud?: number;
  activo: boolean;
}

/** Guarda exclusivamente mediante Java; una respuesta fallida nunca confirma el envío. */
export async function enviarConsulta(payload: ConsultaPayload): Promise<ConsultaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/public/consultas`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se confirmó el envío. Intenta nuevamente.');
  if (!Number.isSafeInteger(data?.idConsulta) || data.idConsulta <= 0 || typeof data.codigo !== 'string' || !data.codigo)
    throw new Error('No se recibió una confirmación válida. Intenta nuevamente.');
  return data;
}

/**
 * Obtiene el catálogo de proyectos activos desde el backend o Supabase.
 */
export async function obtenerProyectosPublicos(): Promise<ProyectoDto[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/proyectos`, {
      headers: { Accept: 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch {
  }

  const { data, error } = await supabase
    .from('inm_proyectos')
    .select('id_proyecto, codigo, nombre, descripcion, direccion, ubicacion_referencia, distrito, provincia, departamento, area_total_m2, latitud, longitud, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true }).limit(200);

  if (error || !data) {
    return [];
  }

  return data.map((p) => ({
    idProyecto: Number(p.id_proyecto),
    codigo: p.codigo,
    nombre: p.nombre,
    descripcion: p.descripcion || undefined,
    direccion: p.direccion || undefined,
    ubicacionReferencia: p.ubicacion_referencia || undefined,
    distrito: p.distrito || undefined,
    provincia: p.provincia || undefined,
    departamento: p.departamento || undefined,
    areaTotal: p.area_total_m2 ? Number(p.area_total_m2) : undefined,
    latitud: p.latitud ? Number(p.latitud) : undefined,
    longitud: p.longitud ? Number(p.longitud) : undefined,
    activo: Boolean(p.activo)
  }));
}

export async function obtenerPaginasPublicadas(): Promise<PaginaDto[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/paginas`, {
      headers: { Accept: 'application/json' }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch {
  }

  const { data, error } = await supabase
    .from('cms_paginas')
    .select('id_pagina, id_estado_publicacion, codigo, slug, titulo, descripcion, titulo_seo, descripcion_seo, orden, mostrar_menu, activo')
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((p) => ({
    idPagina: Number(p.id_pagina),
    idEstado: Number(p.id_estado_publicacion),
    codigo: p.codigo,
    ruta: p.slug,
    titulo: p.titulo,
    descripcion: p.descripcion || undefined,
    tituloSeo: p.titulo_seo || undefined,
    descripcionSeo: p.descripcion_seo || undefined,
    orden: Number(p.orden),
    mostrarMenu: Boolean(p.mostrar_menu),
    activo: Boolean(p.activo)
  }));
}


export interface ProyectoCaptacion { idProyecto: number; nombre: string }
async function paginaProyectosCaptacion(despues: number): Promise<ProyectoCaptacion[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/captacion/proyectos?despues=${despues}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error('No se pudo cargar el catálogo de proyectos. Reintenta la carga.');
  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.some(p => !Number.isSafeInteger(p?.idProyecto) || p.idProyecto <= despues || typeof p.nombre !== 'string'))
    throw new Error('El catálogo de proyectos devolvió una respuesta inválida.');
  return data;
}
export async function obtenerProyectosCaptacion(): Promise<ProyectoCaptacion[]> {
  const rows: ProyectoCaptacion[] = []; let despues = 0;
  while (true) {
    const page = await paginaProyectosCaptacion(despues);
    rows.push(...page); if (page.length < 200) return rows;
    despues = page[page.length - 1].idProyecto;
  }
}
