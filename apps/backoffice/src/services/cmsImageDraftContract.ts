/** Contrato de las imágenes privadas. Nunca construye enlaces públicos de Storage. */
export function rutaImagenBorrador(idBorrador: number, idSeccion: number, revision?: number): string {
  if (!Number.isSafeInteger(idBorrador) || idBorrador <= 0 ||
      !Number.isSafeInteger(idSeccion) || idSeccion <= 0) {
    throw new Error('Identificadores de borrador o sección inválidos.');
  }
  const ruta = `/cms/borradores/${idBorrador}/imagenes/${idSeccion}`;
  if (revision === undefined) return ruta;
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    throw new Error('La revisión esperada del borrador es inválida.');
  }
  return `${ruta}?revisionEsperada=${revision}`;
}

export function imagenNoRegistrada(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const valor = error as { status?: unknown; message?: unknown };
  return valor.status === 404 && valor.message === 'Imagen de borrador no encontrada';
}

export function revisionImagenConfirmada(
  resultado: { idBorrador: number; idSeccion: number; revisionEdicion: number },
  borrador: number, seccion: number, revisionAnterior: number
): number {
  if (resultado.idBorrador !== borrador || resultado.idSeccion !== seccion ||
      resultado.revisionEdicion !== revisionAnterior + 1) {
    throw new Error('La respuesta no coincide con el borrador o su revisión; recarga la lista.');
  }
  return resultado.revisionEdicion;
}
