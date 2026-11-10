/// <reference lib="es2021.intl" />
import { Metadata, type CountryCode, type NumberingPlan } from 'libphonenumber-js/core';
import { getCountries, getCountryCallingCode, getExampleNumber } from 'libphonenumber-js/mobile';
import metadata from 'libphonenumber-js/metadata.mobile.json';
import examples from 'libphonenumber-js/examples.mobile.json';

/** País, prefijo y longitudes del plan móvil utilizado por el selector. */
export interface PhoneCountry {
  code: CountryCode; name: string; callingCode: string; lengths: number[]; example: string; mobilePattern: string;
}

type MobileNumberingPlan = NumberingPlan & { type(kind: 'MOBILE'): { possibleLengths(): number[]; pattern(): string } | undefined };
const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['es'], { type: 'region' }) : undefined;

function countryDetails(code: CountryCode): PhoneCountry {
  const reader = new Metadata(metadata);
  reader.selectNumberingPlan(code);
  const mobile = (reader.numberingPlan as MobileNumberingPlan | undefined)?.type('MOBILE');
  const callingCode = getCountryCallingCode(code);
  return { code, name: names?.of(code) ?? code, callingCode,
    lengths: (mobile?.possibleLengths() ?? []).filter(length => length > 0 && length <= 15 - callingCode.length),
    example: String(getExampleNumber(code, examples)?.nationalNumber ?? ''), mobilePattern: mobile?.pattern() ?? '' };
}

/** Catálogo local completo de países y territorios reconocidos por la biblioteca. */
export const PHONE_COUNTRIES = getCountries().map(countryDetails).sort((a, b) => a.name.localeCompare(b.name, 'es'));

/** Obtiene las reglas del país sin sustituir códigos desconocidos. */
export function phoneCountry(code = 'PE'): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find(country => country.code === code);
}

function searchable(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/** Busca por nombre en español, código ISO o prefijo, con o sin el signo +. */
export function searchPhoneCountries(query: string): PhoneCountry[] {
  const text = searchable(query);
  if (/^\+?\d+$/.test(text)) return PHONE_COUNTRIES.filter(country => country.callingCode.startsWith(text.replace(/^\+/, '')));
  const filtered = PHONE_COUNTRIES.filter(country => searchable(country.name).includes(text) || country.code.toLowerCase().includes(text));
  const exact = (country: PhoneCountry) => country.code.toLowerCase() === text || searchable(country.name) === text;
  return filtered.sort((a, b) => Number(exact(b)) - Number(exact(a)));
}

/** Explica las longitudes nacionales admitidas y muestra un ejemplo del país. */
export function phoneCountryHint(code: string): string {
  const country = phoneCountry(code);
  if (!country?.lengths.length) return 'Selecciona un país con numeración móvil disponible.';
  if (code === 'PE') return '9 dígitos y debe comenzar por 9. Ejemplo: 987654321.';
  return `${country.lengths.join(' o ')} dígitos, sin +${country.callingCode}. Ejemplo: ${country.example}.`;
}
