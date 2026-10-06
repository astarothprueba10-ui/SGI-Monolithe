import type { PaginaContenido } from '../types/cms';
import type { PaginaDto, ProyectoDto } from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8082';

// ---------------------------------------------------------------------------
// Paginas publicadas (contenido completo con secciones + multimedia)
// ---------------------------------------------------------------------------

export async function obtenerContenidoPorCodigo(
  codigo: string
): Promise<PaginaContenido> {

  const response = await fetch(
    `${API_BASE}/api/public/paginas/contenido/codigo/${encodeURIComponent(codigo)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener la pagina ${codigo} (${response.status})`
    );
  }

  return response.json();
}

export async function obtenerContenidoPorRuta(
  ruta: string
): Promise<PaginaContenido> {

  const response = await fetch(
    `${API_BASE}/api/public/paginas/contenido/ruta?ruta=${encodeURIComponent(ruta)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener la pagina con ruta ${ruta} (${response.status})`
    );
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Paginas publicadas (metadatos, sin contenido)
// ---------------------------------------------------------------------------

export async function obtenerPaginasMenu(): Promise<PaginaDto[]> {
  const response = await fetch(
    `${API_BASE}/api/public/paginas`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) return [];

  return response.json();
}

// ---------------------------------------------------------------------------
// Proyectos publicos
// ---------------------------------------------------------------------------

export async function obtenerProyectoPublico(
  id: number
): Promise<ProyectoDto | null> {

  const response = await fetch(
    `${API_BASE}/api/public/proyectos/${id}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) return null;

  return response.json();
}

export async function obtenerProyectoPorCodigo(
  codigo: string
): Promise<ProyectoDto | null> {

  const response = await fetch(
    `${API_BASE}/api/public/proyectos/codigo/${encodeURIComponent(codigo)}`,
    { headers: { Accept: 'application/json' } }
  );

  if (!response.ok) return null;

  return response.json();
}
