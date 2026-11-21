import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { buscarLotes } from '../../../lib/projectLotSearch';
import type { ConfiguracionProyectoResponse } from '../../../types/projectConfiguration';

type Lote = ConfiguracionProyectoResponse['lotes'][number];

type Props = {
  lotes: Lote[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function LotSearchCombobox({ lotes, value, onChange, disabled = false }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState(0);
  const seleccionado = lotes.find(l => String(l.id) === value);
  const opciones = useMemo(() => buscarLotes(lotes, abierto ? busqueda : ''),
    [lotes, abierto, busqueda]);

  useEffect(() => {
    if (!abierto) setBusqueda(seleccionado?.codigo ?? '');
  }, [abierto, seleccionado?.codigo]);

  useEffect(() => {
    if (!abierto) return;
    function fuera(event: PointerEvent) {
      if (contenedor.current && !contenedor.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  function abrir() {
    if (disabled || !lotes.length) return;
    setBusqueda('');
    setActivo(0);
    setAbierto(true);
    input.current?.focus();
  }

  function cerrar() {
    setAbierto(false);
    setBusqueda(seleccionado?.codigo ?? '');
  }

  function elegir(lote: Lote) {
    onChange(String(lote.id));
    setBusqueda(lote.codigo);
    setAbierto(false);
  }

  function tecla(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!abierto) {
        abrir();
      } else if (opciones.length) {
        setActivo(i => (i + (event.key === 'ArrowDown' ? 1 : -1) + opciones.length) % opciones.length);
      }
    } else if (event.key === 'Enter' && abierto) {
      event.preventDefault();
      if (opciones[activo]) elegir(opciones[activo]);
    } else if (event.key === 'Escape' && abierto) {
      event.preventDefault();
      cerrar();
    } else if (event.key === 'Tab' && abierto) {
      cerrar();
    }
  }

  return <div ref={contenedor} className="relative min-w-0">
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400"
        aria-hidden="true"/>
      <input ref={input} type="text" role="combobox" aria-label="Buscar y seleccionar lote"
        aria-autocomplete="list" aria-expanded={abierto} aria-controls={listaId}
        aria-activedescendant={abierto && opciones[activo] ? `${listaId}-opcion-${activo}` : undefined}
        autoComplete="off" value={abierto ? busqueda : seleccionado?.codigo ?? ''}
        disabled={disabled || !lotes.length} placeholder="Busca por código o despliega la lista"
        className="h-11 w-full min-w-0 rounded-md border border-brand-200 bg-white py-2 pl-10 pr-11 text-sm text-brand-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-brand-50"
        onFocus={() => { if (!abierto) abrir(); }}
        onChange={e => { setBusqueda(e.target.value); setActivo(0); setAbierto(true); }}
        onKeyDown={tecla}/>
      <button type="button" aria-label={abierto ? 'Cerrar lista de lotes' : 'Abrir lista de lotes'}
        aria-expanded={abierto} disabled={disabled || !lotes.length}
        onMouseDown={e => e.preventDefault()}
        onClick={() => abierto ? cerrar() : abrir()}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-brand-600 hover:bg-brand-50 disabled:opacity-50">
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${abierto ? 'rotate-180' : ''}`}/>
      </button>
    </div>
    {abierto && !disabled && <div id={listaId} role="listbox" aria-label="Lotes encontrados"
      className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-brand-200 bg-white p-1 shadow-lg">
      {opciones.length === 0 ? <p className="px-3 py-3 text-sm text-brand-500">No hay lotes que coincidan con la búsqueda.</p>
        : opciones.map((lote, index) =>
          <button key={lote.id} type="button" id={`${listaId}-opcion-${index}`}
            role="option" aria-selected={String(lote.id) === value}
            onMouseDown={e => e.preventDefault()}
            onMouseEnter={() => setActivo(index)}
            onClick={() => elegir(lote)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${index === activo
              ? 'bg-brand-100 text-brand-900' : 'text-brand-800 hover:bg-brand-50'}`}>
            <span className="font-medium">{lote.codigo}</span>
            {String(lote.id) === value && <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true"/>}
          </button>)}
      <p className="sticky bottom-0 border-t border-brand-100 bg-white px-3 py-2 text-xs text-brand-500">
        {opciones.length} de {lotes.length} lotes · Escribe para filtrar
      </p>
    </div>}
  </div>;
}
