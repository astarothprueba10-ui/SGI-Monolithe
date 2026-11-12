/** Conserva letras y tildes y utiliza inicial mayúscula en cada palabra del nombre. */
export function formatPersonName(value: string | null | undefined): string {
  return (value ?? '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es-PE')
    .replace(/(^|[\s'’-])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase('es-PE'));
}
