
/** Edición segura de múltiples secciones CMS. */

export interface CambioTextoCms {
  idSeccion: number;
  titulo?: string;
  subtitulo?: string;
  contenido?: string;
}

export interface CamposPromoCms {
  titulo: string;
  subtitulo: string;
  contenido: string;
}

type Campo = keyof CamposPromoCms;

const campos: readonly Campo[] = [
  'titulo',
  'subtitulo',
  'contenido'
];

const maximos: Record<Campo, number> = {
  titulo: 180,
  subtitulo: 255,
  contenido: 500
};


/** Detecta cambios editables para impedir pérdida de texto sin guardar. */
export function existenCambiosReales(
  actuales: CamposPromoCms,
  guardados: CamposPromoCms,
  camposEditables: readonly (keyof CamposPromoCms)[]
): boolean {
  return camposEditables.some(campo =>
    actuales[campo].trim() !== guardados[campo].trim()
  );
}

/** Asocia un borrador de página a sus slides usando los IDs reales del CMS. */
export function identificarSlidesBorrador(
  borrador: { tipoObjetivo: string; idPagina: number | null; contenidoPendiente: Record<string, unknown> },
  slides: readonly { numero: 1 | 2 | 3; idSeccionCms: number | null }[],
  idPaginaEsperada: number
): Array<1 | 2 | 3> {
  if (borrador.tipoObjetivo !== 'PAGINA' || borrador.idPagina !== idPaginaEsperada) return [];

  try {
    const ids = new Set(extraerCambiosCms(borrador.contenidoPendiente).map(c => c.idSeccion));
    return slides.filter(s => s.idSeccionCms !== null && ids.has(s.idSeccionCms))
      .map(s => s.numero);
  } catch {
    return [];
  }
}

/**
 * Selecciona una sección inicial válida del borrador. Cuando el mismo borrador
 * contiene la portada y un slide promocional, abre primero el promocional;
 * los demás permanecen accesibles desde el selector de diapositivas.
 */
export function elegirSlideInicialBorrador(
  slidesAsociados: readonly (1 | 2 | 3)[],
  slideActual: 1 | 2 | 3
): 1 | 2 | 3 | null {
  const slidesPromocionales = slidesAsociados.filter(numero => numero !== 1);

  if (slidesPromocionales.length > 0) {
    return slideActual !== 1 && slidesPromocionales.includes(slideActual)
      ? slideActual
      : slidesPromocionales[0];
  }

  return slidesAsociados.includes(slideActual)
    ? slideActual
    : slidesAsociados[0] ?? null;
}

/**
 * Los borradores pueden contener varias secciones. Permite navegar solamente
 * por las asociadas al borrador y nunca perder cambios locales sin guardar.
 * null en slidesAsociados significa que aún no hay borrador seleccionado.
 */
export function validarCambioSlideBorrador(
  numeroDestino: 1 | 2 | 3,
  slidesAsociados: readonly (1 | 2 | 3)[] | null,
  cambiosSinGuardar: boolean
): string | null {
  if (cambiosSinGuardar) {
    return 'Guarda primero los cambios del slide actual antes de cambiar de diapositiva.';
  }

  if (slidesAsociados !== null && !slidesAsociados.includes(numeroDestino)) {
    return 'Esta diapositiva no está asociada al borrador seleccionado. Deja de editar el borrador para trabajar en otra.';
  }

  return null;
}

/**
 * Convierte el contenido guardado en cambios de secciones.
 * Rechaza identificadores duplicados y estructuras inválidas.
 */
export function extraerCambiosCms(
  contenidoPendiente: Record<string, unknown>
): CambioTextoCms[] {

  const entradas = contenidoPendiente.secciones;

  if (!Array.isArray(entradas)) {
    throw new Error(
      'El borrador no contiene una colección de secciones válida.'
    );
  }

  const ids = new Set<number>();

  return entradas.map((entrada: unknown) => {

    if (!entrada || typeof entrada !== 'object') {
      throw new Error('Cambio de sección inválido.');
    }

    const dato = entrada as Record<string, unknown>;
    const id = dato.id_seccion;

    if (
      !Number.isSafeInteger(id) ||
      Number(id) <= 0 ||
      ids.has(Number(id))
    ) {
      throw new Error(
        'El borrador contiene una sección duplicada o inválida.'
      );
    }

    ids.add(Number(id));

    const cambio: CambioTextoCms = {
      idSeccion: Number(id)
    };

    for (const campo of campos) {

      if (dato[campo] !== undefined && dato[campo] !== null) {

        if (typeof dato[campo] !== 'string') {
          throw new Error(`Texto de ${campo} inválido.`);
        }

        cambio[campo] = dato[campo] as string;
      }
    }

    return cambio;
  });
}

/**
 * Recupera los textos del borrador.
 * Si un campo no tiene cambios, utiliza el contenido publicado.
 */
export function cargarCamposPromo(
  seccion: {
    idSeccion: number;
    titulo: string | null;
    subtitulo: string | null;
    contenido: string | null;
  } | null,
  contenidoPendiente?: Record<string, unknown>
): CamposPromoCms {

  const cambio = seccion && contenidoPendiente
    ? extraerCambiosCms(contenidoPendiente)
      .find((c) => c.idSeccion === seccion.idSeccion)
    : null;

  return {
    titulo: cambio?.titulo ?? seccion?.titulo ?? '',
    subtitulo: cambio?.subtitulo ?? seccion?.subtitulo ?? '',
    contenido: cambio?.contenido ?? seccion?.contenido ?? ''
  };
}

/**
 * Valida el subtítulo promocional.
 * Permite dejarlo vacío porque es opcional.
 */
export function validarSubtituloPromo(
  subtitulo: string
): string | null {

  if (subtitulo.length > maximos.subtitulo) {
    return `El subtítulo no puede superar ${maximos.subtitulo} caracteres.`;
  }

  if (/[<>]/.test(subtitulo)) {
    return 'El subtítulo contiene caracteres no permitidos.';
  }

  return null;
}

/**
 * Valida los tres campos del slide.
 */
export function validarCamposPromo(
  valores: CamposPromoCms
): string | null {

  if (!valores.titulo.trim()) {
    return 'Escribe un título promocional para guardar este slide.';
  }

  for (const campo of campos) {

    const valor = valores[campo];

    if (valor.length > maximos[campo]) {
      return `El campo ${campo} no puede superar ${maximos[campo]} caracteres.`;
    }

    if (/[<>]/.test(valor)) {
      return `El campo ${campo} contiene caracteres no permitidos.`;
    }
  }

  return null;
}

/**
 * Conserva los cambios de todas las secciones.
 * No sobrescribe los textos de otros slides.
 */
export function fusionarCambioSlide(
  contenidoPendiente: Record<string, unknown> | null,
  idSeccion: number,
  valores: CamposPromoCms,
  soloSubtitulo = false
): CambioTextoCms[] {

  if (!Number.isSafeInteger(idSeccion) || idSeccion <= 0) {
    throw new Error('Sección CMS inválida.');
  }

  const error = soloSubtitulo
    ? validarSubtituloPromo(valores.subtitulo)
    : validarCamposPromo(valores);

  if (error) {
    throw new Error(error);
  }

  const cambios = contenidoPendiente
    ? extraerCambiosCms(contenidoPendiente)
    : [];

  const indice = cambios.findIndex(
    (c) => c.idSeccion === idSeccion
  );

  const existente = indice >= 0
    ? cambios[indice]
    : { idSeccion };

  const normalizado = {
    titulo: valores.titulo.trim(),
    subtitulo: valores.subtitulo.trim(),
    contenido: valores.contenido.trim()
  };

  const nuevo: CambioTextoCms = soloSubtitulo
    ? {
      ...existente,
      idSeccion,
      subtitulo: normalizado.subtitulo
    }
    : {
      idSeccion,
      ...normalizado
    };

  if (indice < 0) {
    cambios.push(nuevo);
  } else {
    cambios[indice] = nuevo;
  }

  return cambios;
}

/**
 * Prepara un cambio exclusivo de imagen.
 * Conserva los textos previamente guardados.
 */
export function prepararCambioSoloImagen(
  contenidoPendiente: Record<string, unknown> | null,
  idSeccion: number
): CambioTextoCms[] {

  if (!Number.isSafeInteger(idSeccion) || idSeccion <= 0) {
    throw new Error('Sección CMS inválida.');
  }

  const cambios = contenidoPendiente
    ? extraerCambiosCms(contenidoPendiente)
    : [];

  if (!cambios.some((c) => c.idSeccion === idSeccion)) {
    cambios.push({ idSeccion });
  }

  return cambios;
}

/**
 * Comprueba si una sección tiene cambios guardados.
 */
export function seccionGuardada(
  contenidoPendiente: Record<string, unknown>,
  idSeccion: number
): boolean {

  return extraerCambiosCms(contenidoPendiente)
    .some((c) => c.idSeccion === idSeccion);
}
