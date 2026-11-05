const NAME = /^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u;

/** Conserva letras, tildes y espacios; normaliza caracteres Unicode equivalentes. */
export function filtrarNombrePublico(value: string): string {
  return value.normalize('NFC').replace(/\s/gu, ' ').replace(/[^\p{L}\p{M} ]/gu, '');
}

/** Comprueba que cada palabra del nombre comience con una letra. */
export function esNombrePublicoValido(value: string): boolean {
  return NAME.test(value.trim().normalize('NFC'));
}

/** Limita el celular a nueve dígitos y conserva el valor anterior si el inicio es inválido. */
export function filtrarCelularPublico(value: string, previous = ''): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 9);
  return !digits || digits.startsWith('9') ? digits : previous;
}

/** Exige un celular peruano de nueve dígitos que comience por nueve. */
export function esCelularPublicoValido(value: string): boolean {
  return /^9[0-9]{8}$/.test(value);
}

/** Conserva los ceros iniciales y limita el DNI a ocho dígitos. */
export function filtrarDniPublico(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 8);
}

/** Permite omitir el DNI; cuando se proporciona exige exactamente ocho dígitos. */
export function esDniPublicoValido(value: string): boolean {
  return value === '' || /^[0-9]{8}$/.test(value);
}

/** Aplica las reglas de los campos personales sin alterar el resto del formulario. */
export function normalizarCampoPublico(field: string, value: string, previous: string): string {
  if (['name', 'nombres', 'apellidos'].includes(field)) return filtrarNombrePublico(value);
  if (['phone', 'telefono'].includes(field)) return filtrarCelularPublico(value, previous);
  if (field === 'dni') return filtrarDniPublico(value);
  return value;
}

/** Inserta el texto completo pegado antes de filtrar y limitar la cantidad de dígitos. */
export function insertarTextoPublico(value: string, text: string, start: number | null, end: number | null): string {
  const from = start ?? value.length;
  const to = end ?? from;
  return value.slice(0, from) + text + value.slice(to);
}
