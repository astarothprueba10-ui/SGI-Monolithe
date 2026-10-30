/** Reglas de presentación para 3E.4: el backend sigue siendo la autoridad final. */
import type { BorradorCms } from './webContentDraftService';
import type { SeccionCmsPreview } from './cmsPreview';

export interface SolicitudPublicarTextos {
  revisionEditorialEsperada: number;
  revisionPublicadaEsperada: number;
}

export interface PublicacionTextosRespuesta {
  idHistorial: number;
  idBorrador: number;
  idPagina: number;
  revisionAnterior: number;
  revisionNueva: number;
}

export interface TextoPublicable {
  campo: 'titulo' | 'subtitulo' | 'contenido';
  actual: string;
  nuevo: string;
}

export interface SeccionPublicable {
  idSeccion: number;
  codigo: string;
  textos: TextoPublicable[];
}

export type EvaluacionPublicacion =
  | { valido: true; secciones: SeccionPublicable[] }
  | { valido: false; motivo: string };

const campos = ['titulo', 'subtitulo', 'contenido'] as const;
const permitidos = new Set(['id_seccion', ...campos]);
const codigos = new Set(['HERO_PRINCIPAL', 'HERO_SLIDE_2_PROMO', 'HERO_SLIDE_3_PROMO']);
const limites = { titulo: 180, subtitulo: 255, contenido: 10_000 };

/** Refleja el contrato de texto de 3E.2; jamás reemplaza la validación en Java. */
export function evaluarBorradorPublicable(
  borrador: BorradorCms | null,
  catalogo: readonly SeccionCmsPreview[] | null,
  idPaginaInicio: number,
  seccionesConImagenPrivada: ReadonlySet<number> = new Set()
): EvaluacionPublicacion {
  const denegar = (motivo: string): EvaluacionPublicacion => ({ valido: false, motivo });
  if (!borrador || borrador.tipoObjetivo !== 'PAGINA' ||
      borrador.estado !== 'EN_EDICION' || borrador.idPagina !== idPaginaInicio) {
    return denegar('Selecciona un borrador de página INICIO en edición.');
  }
  if (!Number.isSafeInteger(borrador.idBorrador) || borrador.idBorrador <= 0 ||
      !Number.isSafeInteger(borrador.revisionEdicion) || borrador.revisionEdicion < 1 ||
      !Number.isSafeInteger(borrador.revisionBase) || borrador.revisionBase < 0) {
    return denegar('Las revisiones del borrador son inválidas. Recarga la lista.');
  }
  if (!catalogo) return denegar('No se pudo cargar el catálogo de secciones de Inicio.');
  const entradas = borrador.contenidoPendiente?.secciones;
  if (!Array.isArray(entradas) || entradas.length < 1 || entradas.length > 3 ||
      Object.keys(borrador.contenidoPendiente).some((k) => k !== 'secciones')) {
    return denegar('Este borrador contiene cambios que no se pueden publicar como textos.');
  }
  const usados = new Set<number>();
  const secciones: SeccionPublicable[] = [];
  for (const entrada of entradas) {
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
      return denegar('El borrador contiene una sección inválida.');
    }
    const dato = entrada as Record<string, unknown>;
    const id = dato.id_seccion;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 || usados.has(id) ||
        Object.keys(dato).some((clave) => !permitidos.has(clave))) {
      return denegar('El borrador contiene campos o secciones no autorizados.');
    }
    usados.add(id);
    const seccion = catalogo.find((item) => item.idSeccion === id &&
      item.idPagina === idPaginaInicio && item.activo && codigos.has(item.codigo));
    if (!seccion) return denegar('El borrador contiene una sección no autorizada o inactiva.');
    if (seccion.codigo !== 'HERO_PRINCIPAL' &&
        (Object.prototype.hasOwnProperty.call(dato, 'titulo') || Object.prototype.hasOwnProperty.call(dato, 'contenido'))) {
      return denegar('Los slides 2 y 3 solo admiten publicar su subtítulo promocional. ' +
        'Este borrador también contiene título o descripción; no se omitirá ningún cambio silenciosamente.');
    }
    const textos: TextoPublicable[] = [];
    for (const campo of campos) {
      if (!Object.prototype.hasOwnProperty.call(dato, campo)) continue;
      const valor = dato[campo];
      if (typeof valor !== 'string' || valor.length > limites[campo] || /[<>]/.test(valor)) {
        return denegar(`El campo ${campo} no cumple el contrato de publicación.`);
      }
      textos.push({ campo, actual: seccion[campo] ?? '', nuevo: valor });
    }
    if (!textos.length && !seccionesConImagenPrivada.has(id)) {
      return denegar('Una sección sin textos necesita una imagen privada guardada y verificada en la previsualización.');
    }
    secciones.push({ idSeccion: id, codigo: seccion.codigo, textos });
  }
  return { valido: true, secciones };
}

export function solicitudPublicacion(borrador: BorradorCms): SolicitudPublicarTextos {
  return {
    revisionEditorialEsperada: borrador.revisionEdicion,
    revisionPublicadaEsperada: borrador.revisionBase
  };
}
