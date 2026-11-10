import { parsePhoneNumberFromString, type CountryCode, type PhoneNumber } from 'libphonenumber-js/mobile';
import { phoneCountry } from './phoneCountries';

function matchesCountry(number: PhoneNumber, country: CountryCode): boolean {
  return number.countryCallingCode === phoneCountry(country)?.callingCode && !leadPhoneError(String(number.nationalNumber), country);
}

function mobile(number: PhoneNumber): boolean {
  return number.isValid() && ['MOBILE', 'FIXED_LINE_OR_MOBILE'].includes(number.getType() ?? '');
}

/** Comprueba longitud y prefijos nacionales, con la regla explícita del celular peruano. */
export function leadPhoneError(value: string, countryCode?: string): string | undefined {
  if (!value) return 'Ingresa el número de celular.';
  if (!countryCode && value.startsWith('+')) {
    const legacy = parsePhoneNumberFromString(value, { extract: false });
    return /^\+[1-9]\d{6,14}$/.test(value) && legacy && mobile(legacy) ? undefined : 'Ingresa un número móvil internacional válido.';
  }
  const country = phoneCountry(countryCode ?? 'PE');
  if (!country?.lengths.length) return 'Selecciona un país con numeración móvil disponible.';
  if (country.code === 'PE' && !/^9\d{8}$/.test(value)) return 'El celular de Perú debe tener 9 dígitos y comenzar por 9.';
  if (!country.lengths.includes(value.length) || !/^\d+$/.test(value) || !new RegExp(`^(?:${country.mobilePattern})$`).test(value)) return `Ingresa un celular válido de ${country.name} (${country.lengths.join(' o ')} dígitos).`;
  return undefined;
}

/** Conserva el formato peruano existente y agrega el prefijo a los demás países. */
export function serializeLeadPhone(value: string, countryCode = 'PE'): string {
  if (leadPhoneError(value, countryCode)) throw new Error('El teléfono no es válido para el país seleccionado.');
  return countryCode === 'PE' ? value : `+${phoneCountry(countryCode)!.callingCode}${value}`;
}

/** Acepta pegado nacional o internacional completo sin truncar números demasiado largos. */
export function pastedLeadPhone(text: string, countryCode: string): { value?: string; error?: string } {
  const country = phoneCountry(countryCode);
  const clean = text.trim().replace(/[\s().-]/g, '');
  if (!country || !/^\+?\d+$/.test(clean)) return { error: 'Pega un número de teléfono sin letras ni extensiones.' };
  const parsed = parsePhoneNumberFromString(clean, { defaultCountry: country.code, extract: false });
  if (clean.startsWith('+') && (!parsed || !matchesCountry(parsed, country.code)))
    return { error: 'El prefijo pegado no corresponde al país seleccionado.' };
  const value = parsed && matchesCountry(parsed, country.code) ? String(parsed.nationalNumber) : clean;
  const maximum = Math.max(0, ...country.lengths);
  if (!/^\d+$/.test(value) || !maximum || value.length > maximum)
    return { error: `El número supera la longitud permitida para ${country.name}.` };
  return { value };
}
