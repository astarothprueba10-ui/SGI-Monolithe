export interface CaptacionDatos {
  nombres: string; apellidoPaterno: string; apellidoMaterno?: string | null;
  correo: string; telefono: string; idProyecto: number;
  motivoContacto: string; mensaje?: string | null;
  tipoDocumento?: string | null; numeroDocumento?: string | null;
}
export const normalizarTexto = (value?: string | null) => value?.trim() || null;
export function normalizarCaptacion(d: CaptacionDatos): CaptacionDatos {
  return { ...d, nombres: d.nombres.trim(), apellidoPaterno: d.apellidoPaterno.trim(),
    apellidoMaterno: normalizarTexto(d.apellidoMaterno), correo: d.correo.trim().toLowerCase(),
    telefono: d.telefono.trim().replace(/[ ()-]/g, ''), motivoContacto: d.motivoContacto.trim(),
    mensaje: normalizarTexto(d.mensaje), tipoDocumento: normalizarTexto(d.tipoDocumento)?.toUpperCase() || null,
    numeroDocumento: normalizarTexto(d.numeroDocumento)?.toUpperCase() || null };
}
export function validarDocumento(d: CaptacionDatos): string | null {
  if (!d.tipoDocumento && !d.numeroDocumento) return null;
  const patterns: Record<string, RegExp> = { DNI: /^[0-9]{8}$/, CE: /^[A-Z0-9-]{8,12}$/, PASAPORTE: /^[A-Z0-9-]{6,20}$/ };
  return d.tipoDocumento && patterns[d.tipoDocumento]?.test(d.numeroDocumento || '')
    ? null : 'Indica un documento válido o deja ambos campos vacíos';
}
export function validarCaptacion(raw: CaptacionDatos): Record<string, string> {
  const d = normalizarCaptacion(raw), e: Record<string, string> = {};
  if (!d.nombres || d.nombres.length > 120) e.nombres = 'Nombres obligatorios, máximo 120 caracteres';
  if (!d.apellidoPaterno || d.apellidoPaterno.length > 80) e.apellidoPaterno = 'Apellidos obligatorios, máximo 80 caracteres';
  if ((d.apellidoMaterno?.length || 0) > 80) e.apellidoMaterno = 'Máximo 80 caracteres';
  if ([d.nombres,d.apellidoPaterno,d.apellidoMaterno].filter(Boolean).join(' ').length > 150) e.nombres = 'Nombre completo: máximo 150 caracteres';
  if (d.correo.length > 180 || !/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(d.correo)) e.correo = 'Correo válido obligatorio';
  if (raw.telefono.trim().length > 40 || !/^\+?[0-9 ()-]+$/.test(raw.telefono.trim()) || !/^([0-9]{7,15}|\+[1-9][0-9]{6,14})$/.test(d.telefono)) e.telefono = 'Teléfono obligatorio de 7 a 15 dígitos';
  if (!Number.isSafeInteger(d.idProyecto) || d.idProyecto <= 0) e.idProyecto = 'Selecciona un proyecto';
  if (!d.motivoContacto || d.motivoContacto.length > 150) e.motivoContacto = 'Motivo obligatorio, máximo 150 caracteres';
  if ((d.mensaje?.length || 0) > 4000) e.mensaje = 'Máximo 4000 caracteres';
  const doc = validarDocumento(d); if (doc) e.numeroDocumento = doc;
  return e;
}
export class IdentidadEnvio {
  private firma = ''; private id = '';
  para(datos: unknown): string {
    const firma = JSON.stringify(datos);
    if (firma !== this.firma || !this.id) { this.firma = firma; this.id = crypto.randomUUID(); }
    return this.id;
  }
  reiniciar() { this.firma = ''; this.id = ''; }
}
