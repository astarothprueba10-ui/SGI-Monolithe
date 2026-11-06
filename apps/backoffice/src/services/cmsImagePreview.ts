/** Validación de imágenes seleccionadas SOLO para previsualización local.
 * No se suben al servidor, no se convierten en URLs públicas y no se guardan en el borrador.
 */
export interface ImagenLocalMetadatos {
  name: string;
  type: string;
  size: number;
}

export const LIMITE_IMAGEN_LOCAL = 5 * 1024 * 1024;

const extensionesPermitidas: Record<string, RegExp> = {
  'image/jpeg': /\.(jpe?g)$/i,
  'image/png': /\.png$/i,
  'image/webp': /\.webp$/i
};

export function validarImagenLocal(archivo: ImagenLocalMetadatos | null): string | null {
  if (!archivo) return 'Selecciona una imagen.';
  const extension = extensionesPermitidas[archivo.type];
  if (!extension || !extension.test(archivo.name)) {
    return 'Solo se permiten archivos JPG, PNG o WebP con su extensión correcta.';
  }
  if (!archivo.name.trim() || archivo.name.length > 255) {
    return 'El nombre del archivo no es válido.';
  }
  if (!Number.isSafeInteger(archivo.size) || archivo.size <= 0) {
    return 'La imagen está vacía o su tamaño no es válido.';
  }
  if (archivo.size > LIMITE_IMAGEN_LOCAL) {
    return 'La imagen supera el máximo permitido de 5 MB para esta vista previa.';
  }
  return null;
}
