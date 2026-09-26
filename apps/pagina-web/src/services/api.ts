import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082';

export interface ConsultaPayload {
  nombre: string;
  correo?: string;
  telefono?: string;
  idProyecto?: number;
  idPagina?: number;
  asunto?: string;
  mensaje: string;
  aceptaPrivacidad?: boolean;
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

/**
 * Registra una consulta o lead comercial desde la web pública.
 * Soporta envío directo por API REST Spring Boot o Supabase BaaS.
 */
export async function enviarConsulta(payload: ConsultaPayload): Promise<ConsultaResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/consultas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return await response.json();
    }
  } catch {
  }

  return enviarConsultaDirectoSupabase(payload);
}

async function enviarConsultaDirectoSupabase(payload: ConsultaPayload): Promise<ConsultaResponse> {
  const codigo = generarCodigoSeguimiento();
  const fechaRecepcion = new Date().toISOString();

  const { data, error } = await supabase
    .from('cms_consultas_web')
    .insert([
      {
        id_estado_consulta_web: 6,
        codigo: codigo,
        nombres: payload.nombre.trim(),
        correo: payload.correo?.trim() || null,
        telefono: payload.telefono?.trim() || null,
        asunto: payload.asunto?.trim() || 'Consulta Web',
        mensaje: payload.mensaje.trim(),
        acepta_privacidad: Boolean(payload.aceptaPrivacidad),
        id_proyecto: payload.idProyecto || null,
        id_pagina: payload.idPagina || null,
        fecha_recepcion: fechaRecepcion
      }
    ])
    .select('id_consulta_web, codigo, nombres, correo, telefono, id_proyecto, fecha_recepcion')
    .single();

  if (error) {
    throw new Error('No se pudo registrar la consulta: ' + error.message);
  }

  return {
    idConsulta: Number(data.id_consulta_web),
    codigo: data.codigo,
    nombre: data.nombres,
    correo: data.correo || undefined,
    telefono: data.telefono || undefined,
    idProyecto: data.id_proyecto ? Number(data.id_proyecto) : undefined,
    fechaRecepcion: data.fecha_recepcion,
    mensaje: '¡Gracias por contactarnos! Tu consulta ha sido recibida con éxito.'
  };
}

function generarCodigoSeguimiento(): string {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CW-${fecha}-${rand}`;
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
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
  }

  const { data, error } = await supabase
    .from('inm_proyectos')
    .select('id_proyecto, codigo, nombre, descripcion, direccion, ubicacion_referencia, distrito, provincia, departamento, area_total_m2, latitud, longitud, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true });

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
