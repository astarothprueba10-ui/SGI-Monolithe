/** Proyección privada de un borrador guardado sobre una sección CMS existente.
 * No interpreta HTML, no consulta la web pública y no escribe datos.
 */
export interface SeccionCmsPreview {
  idSeccion: number;
  idPagina: number;
  codigo: string;
  titulo: string | null;
  subtitulo: string | null;
  contenido: string | null;
  activo: boolean;
  visible: boolean;
}

interface BorradorPaginaPreview {
  idPagina: number | null;
  tipoObjetivo: string;
  estado: string;
  contenidoPendiente: Record<string, unknown>;
}

export interface CampoPreview {
  actual: string;
  borrador: string;
  modificado: boolean;
}

export interface ContenidoPreview {
  titulo: CampoPreview;
  subtitulo: CampoPreview;
  contenido: CampoPreview;
}

export function proyectarBorradorPagina(
  seccion: SeccionCmsPreview,
  borrador: BorradorPaginaPreview
): ContenidoPreview | null {
  if (borrador.tipoObjetivo !== 'PAGINA' || borrador.estado !== 'EN_EDICION' ||
      borrador.idPagina !== seccion.idPagina || !seccion.activo) {
    return null;
  }

  const cambios = borrador.contenidoPendiente.secciones;
  if (!Array.isArray(cambios)) return null;
  const cambio = cambios.find((entrada: unknown) =>
    entrada !== null && typeof entrada === 'object' &&
    'id_seccion' in entrada && entrada.id_seccion === seccion.idSeccion
  );
  if (cambio === null || typeof cambio !== 'object') return null;

  function campo(nombre: 'titulo' | 'subtitulo' | 'contenido'): CampoPreview {
    const actual = seccion[nombre] ?? '';
    const pendiente = (cambio as Record<string, unknown>)[nombre];
    const valor = typeof pendiente === 'string' ? pendiente : actual;
    return { actual, borrador: valor, modificado: valor !== actual };
  }

  return {
    titulo: campo('titulo'),
    subtitulo: campo('subtitulo'),
    contenido: campo('contenido')
  };
}
