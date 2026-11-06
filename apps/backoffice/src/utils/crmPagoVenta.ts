export type MetodoPagoVenta = 'TRANSFERENCIA' | 'DEPOSITO' | 'YAPE_PLIN' | 'EFECTIVO' | 'OTRO';

export function validarPagoVenta(
  metodo: MetodoPagoVenta,
  numeroOperacion: string,
  archivos: ReadonlyArray<Pick<File, 'name' | 'size' | 'type'>>
): string | null {
  const noEfectivo = metodo !== 'EFECTIVO';
  const requiereNumero = metodo === 'TRANSFERENCIA' || metodo === 'DEPOSITO' || metodo === 'YAPE_PLIN';
  if (requiereNumero && !numeroOperacion.trim())
    return 'Ingrese el número de operación del pago.';
  if (numeroOperacion.trim().length > 80)
    return 'El número de operación no debe superar 80 caracteres.';
  if (archivos.length > 8)
    return 'Se permiten como máximo 8 comprobantes.';
  if (noEfectivo && archivos.length === 0)
    return 'Adjunte al menos un comprobante del pago.';
  for (const archivo of archivos) {
    if (!archivo.name.trim() || archivo.name.length > 255
        || archivo.size < 1 || archivo.size > 5 * 1024 * 1024
        || !['application/pdf','image/jpeg','image/png','image/webp'].includes(archivo.type))
      return 'Los archivos deben ser PDF o imágenes de hasta 5 MB.';
  }
  return null;
}
