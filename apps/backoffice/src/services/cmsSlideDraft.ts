/** Edición segura de múltiples secciones: PUT reemplaza el JSON completo del borrador. */
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
const campos: readonly Campo[] = ['titulo', 'subtitulo', 'contenido'];
const maximos: Record<Campo, number> = { titulo: 180, subtitulo: 255, contenido: 500 };

export function extraerCambiosCms(contenidoPendiente: Record<string, unknown>): CambioTextoCms[] {
  const entradas = contenidoPendiente.secciones;
  if (!Array.isArray(entradas)) throw new Error('El borrador no contiene una colección de secciones válida.');
  const ids = new Set<number>();
  return entradas.map((entrada: unknown) => {
    if (!entrada || typeof entrada !== 'object') throw new Error('Cambio de sección inválido.');
    const dato = entrada as Record<string, unknown>;
    const id = dato.id_seccion;
    if (!Number.isSafeInteger(id) || Number(id) <= 0 || ids.has(Number(id))) {
      throw new Error('El borrador contiene una sección duplicada o inválida.');
    }
    ids.add(Number(id));
    const cambio: CambioTextoCms = { idSeccion: Number(id) };
    for (const campo of campos) {
      if (dato[campo] !== undefined && dato[campo] !== null) {
        if (typeof dato[campo] !== 'string') throw new Error(`Texto de ${campo} inválido.`);
        cambio[campo] = dato[campo] as string;
      }
    }
    // idSeccion por sí solo indica que el editor preparó un cambio exclusivo de imagen.
    // Publicar sigue requiriendo que el backend valide una imagen privada en esa sección.
    return cambio;
  });
}

export function cargarCamposPromo(
  seccion: { idSeccion: number; titulo: string | null; subtitulo: string | null; contenido: string | null } | null,
  contenidoPendiente?: Record<string, unknown>
): CamposPromoCms {
  const cambio = seccion && contenidoPendiente
    ? extraerCambiosCms(contenidoPendiente).find((c) => c.idSeccion === seccion.idSeccion)
    : null;
  return {
    titulo: cambio?.titulo ?? seccion?.titulo ?? '',
    subtitulo: cambio?.subtitulo ?? seccion?.subtitulo ?? '',
    contenido: cambio?.contenido ?? seccion?.contenido ?? ''
  };
}

export function validarSubtituloPromo(subtitulo: string): string | null {
  if (subtitulo.length > maximos.subtitulo || /[<>]/.test(subtitulo)) {
    return 'El subtítulo promocional supera el límite o contiene caracteres no permitidos.';
  }
  return null;
}

export function validarCamposPromo(valores: CamposPromoCms): string | null {
  if (!valores.titulo.trim()) return 'Escribe un título promocional para guardar este slide.';
  for (const campo of campos) {
    const valor = valores[campo];
    if (valor.length > maximos[campo] || /[<>]/.test(valor)) {
      return `El campo ${campo} supera el límite o contiene caracteres no permitidos.`;
    }
  }
  return null;
}

/** Conserva todos los cambios guardados, incluidos los de otras secciones del CMS. */
export function fusionarCambioSlide(
  contenidoPendiente: Record<string, unknown> | null,
  idSeccion: number,
  valores: CamposPromoCms,
  soloSubtitulo = false
): CambioTextoCms[] {
  if (!Number.isSafeInteger(idSeccion) || idSeccion <= 0) throw new Error('Sección CMS inválida.');
  const error = soloSubtitulo ? validarSubtituloPromo(valores.subtitulo) : validarCamposPromo(valores);
  if (error) throw new Error(error);
  const cambios = contenidoPendiente ? extraerCambiosCms(contenidoPendiente) : [];
  const nuevo: CambioTextoCms = soloSubtitulo
    ? { idSeccion, subtitulo: valores.subtitulo }
    : { idSeccion, ...valores, titulo: valores.titulo.trim() };
  const indice = cambios.findIndex((c) => c.idSeccion === idSeccion);
  if (indice < 0) cambios.push(nuevo);
  else cambios[indice] = nuevo;
  return cambios;
}

/** Prepara un slot de imagen sin alterar textos guardados de ningún slide. */
export function prepararCambioSoloImagen(
  contenidoPendiente: Record<string, unknown> | null, idSeccion: number
): CambioTextoCms[] {
  if (!Number.isSafeInteger(idSeccion) || idSeccion <= 0) throw new Error('Sección CMS inválida.');
  const cambios = contenidoPendiente ? extraerCambiosCms(contenidoPendiente) : [];
  if (!cambios.some((c) => c.idSeccion === idSeccion)) cambios.push({ idSeccion });
  return cambios;
}

export function seccionGuardada(
  contenidoPendiente: Record<string, unknown>, idSeccion: number
): boolean {
  return extraerCambiosCms(contenidoPendiente).some((c) => c.idSeccion === idSeccion);
}
