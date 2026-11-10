import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { searchPhoneCountries } from '../lib/phoneCountries';

/** Coordina búsqueda, selección y navegación con teclado dentro del selector de país. */
export function usePhoneCountrySearch(value: CountryCode, onSelect: (country: CountryCode) => void) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const options = searchPhoneCountries(query);
  const show = () => { setQuery(''); setActive(Math.max(0, searchPhoneCountries('').findIndex(country => country.code === value))); setOpen(!open); };
  const select = (country: CountryCode) => { onSelect(country); setOpen(false); button.current?.focus(); };
  const search = (value: string) => { setQuery(value); setActive(0); };
  const key = (event: KeyboardEvent<HTMLInputElement>) => countrySearchKey(event, { active, options, select, setOpen, setActive, button });
  useCountrySearchFocus(open, active, input);
  useDismissCountrySearch(open, root, () => setOpen(false));
  return { open, setOpen, show, query, search, active, options, select, key, root, input, button };
}

function useCountrySearchFocus(open: boolean, active: number, input: RefObject<HTMLInputElement>) {
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (open) document.getElementById(`lead-country-option-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [open, active]);
}

function useDismissCountrySearch(open: boolean, root: RefObject<HTMLDivElement>, dismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) dismiss(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
}

type KeyContext = { active: number; options: ReturnType<typeof searchPhoneCountries>; select: (country: CountryCode) => void;
  setOpen: (open: boolean) => void; setActive: (update: (index: number) => number) => void; button: RefObject<HTMLButtonElement> };

function countrySearchKey(event: KeyboardEvent<HTMLInputElement>, context: KeyContext) {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
  event.preventDefault(); event.stopPropagation();
  if (event.key === 'Escape') { context.setOpen(false); context.button.current?.focus(); }
  else if (event.key === 'Enter' && context.options[context.active]) context.select(context.options[context.active].code);
  else context.setActive(index => Math.max(0, Math.min(context.options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
}
