/** Cuenta letras Unicode; espacios, números y signos no completan el mínimo. */
export function countProjectDescriptionLetters(value: string): number {
  return (value.normalize('NFC').match(/\p{L}/gu) ?? []).length;
}

/** Exige una descripción con al menos quince letras para registrar un proyecto. */
export function validateProjectDescription(value: string): string | undefined {
  if (!value.trim()) return 'La descripción del proyecto es obligatoria.';
  return countProjectDescriptionLetters(value) < 15
    ? 'La descripción debe contener al menos 15 letras; los espacios y números no cuentan.' : undefined;
}
