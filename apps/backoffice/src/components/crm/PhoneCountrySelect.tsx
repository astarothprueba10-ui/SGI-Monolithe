import { ChevronDownIcon } from 'lucide-react';
import type { CountryCode } from 'libphonenumber-js/mobile';
import { phoneCountry } from '../../lib/phoneCountries';
import { usePhoneCountrySearch } from '../../hooks/usePhoneCountrySearch';
import { Input } from '../ui/Field';

type Model = ReturnType<typeof usePhoneCountrySearch>;

function CountryOptions({ model, selected }: { model: Model; selected: CountryCode }) {
  return <div id="lead-phone-countries" role="listbox" aria-label="Países y códigos telefónicos" className="max-h-44 overflow-y-auto overscroll-contain">
    {model.options.map((country, index) => <button key={country.code} type="button" role="option"
      id={`lead-country-option-${index}`} aria-selected={country.code === selected} tabIndex={-1}
      className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm ${index === model.active ? 'bg-brand-50' : ''}`}
      onMouseDown={event => event.preventDefault()} onClick={() => model.select(country.code)}>
      <span className="min-w-0 break-words">{country.name} ({country.code})</span>
      <span className="shrink-0">+{country.callingCode}</span>
    </button>)}
    {!model.options.length && <p className="p-3 text-xs text-brand-500">No se encontraron países.</p>}
  </div>;
}

/** Selector de país con búsqueda local por nombre, código ISO o prefijo. */
export function PhoneCountrySelect({ value, onChange, disabled }: {
  value: CountryCode; onChange: (value: CountryCode) => void; disabled?: boolean;
}) {
  const model = usePhoneCountrySearch(value, onChange); const country = phoneCountry(value)!;
  return <div ref={model.root} className="min-w-0" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) model.setOpen(false);
  }}>
    <button ref={model.button} type="button" disabled={disabled} aria-label="País y código telefónico"
      aria-expanded={model.open} aria-haspopup="listbox" onClick={model.show}
      className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-brand-200 bg-white px-3 text-left text-base text-brand-800 sm:min-h-9 sm:text-[13px]">
      <span>{country.name} (+{country.callingCode})</span><ChevronDownIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
    {model.open && <CountrySearchPanel model={model} selected={value} />}
  </div>;
}

function CountrySearchPanel({ model, selected }: { model: Model; selected: CountryCode }) {
  return <div className="mt-1 overflow-hidden rounded-md border border-brand-200 bg-white">
    <Input ref={model.input} type="search" role="combobox" aria-label="Buscar país o código" placeholder="Buscar país o código"
      aria-expanded="true" aria-controls="lead-phone-countries" aria-autocomplete="list"
      aria-activedescendant={model.options.length ? `lead-country-option-${model.active}` : undefined}
      value={model.query} onChange={event => model.search(event.target.value)} onKeyDown={model.key} />
    <CountryOptions model={model} selected={selected} />
  </div>;
}
