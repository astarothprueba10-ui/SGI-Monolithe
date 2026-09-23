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
 * Registra una consulta o prospecto comercial desde la web pública.
 */
export async function enviarConsulta(payload: ConsultaPayload): Promise<ConsultaResponse> {
  const response = await fetch(`${API_BASE_URL}/api/public/consultas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error al enviar la consulta');
  }

  return response.json();
}

/**
 * Obtiene la lista de páginas publicadas para la web pública.
 */
export async function obtenerPaginasPublicadas(): Promise<PaginaDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/paginas`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Error al cargar páginas publicadas');
  }

  return response.json();
}

/**
 * Obtiene el detalle de una página pública por su código único.
 */
export async function obtenerPaginaPorCodigo(codigo: string): Promise<PaginaDto> {
  const response = await fetch(`${API_BASE_URL}/api/public/paginas/codigo/${encodeURIComponent(codigo)}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Página ${codigo} no encontrada`);
  }

  return response.json();
}

/**
 * Obtiene el catálogo de proyectos activos para la web pública.
 */
export async function obtenerProyectosPublicos(): Promise<ProyectoDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/public/proyectos`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Error al cargar catálogo de proyectos');
  }

  return response.json();
}

/**
 * Obtiene los detalles de un proyecto por su ID.
 */
export async function obtenerProyectoPorId(id: number | string): Promise<ProyectoDto> {
  const response = await fetch(`${API_BASE_URL}/api/public/proyectos/${id}`, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Proyecto ${id} no encontrado`);
  }

  return response.json();
}
