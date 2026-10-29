import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchIcon, X, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { crmBackend, type CrmProspect } from '../../services/crmBackend';

export interface ProspectSearchAutocompleteProps {
  value: number | null;
  onSelect: (prospect: CrmProspect) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  initialLeads?: CrmProspect[];
  selectedProspect?: CrmProspect | null;
}

const INPUT_BASE =
  'h-9 w-full rounded-md border border-brand-200 bg-white pl-8 pr-7 text-[13px] text-brand-800 ' +
  'placeholder:text-brand-300 transition-colors duration-150 ease-smooth hover:border-brand-300 focus:border-brand-500';

export function ProspectSearchAutocomplete({
  value,
  onSelect,
  placeholder = 'Buscar por nombre, código o DNI...',
  className,
  ariaLabel = 'Buscar prospecto',
  initialLeads = [],
  selectedProspect
}: ProspectSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CrmProspect[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatProspectLabel = useCallback((p: CrmProspect) => {
    const doc = p.numero_documento || p.dni ? ` - DNI: ${p.numero_documento || p.dni}` : '';
    return `${p.codigo} - ${p.nombre_completo}${doc}`;
  }, []);

  useEffect(() => {
    if (selectedProspect) {
      setQuery(formatProspectLabel(selectedProspect));
    } else if (value && initialLeads.length > 0) {
      const match = initialLeads.find((l) => l.id_prospecto === value);
      if (match) setQuery(formatProspectLabel(match));
    } else if (!value) {
      setQuery('');
    }
  }, [value, selectedProspect, initialLeads, formatProspectLabel]);

  const filterLocalPool = useCallback(
    (term: string) => {
      const lower = term.toLowerCase();
      return initialLeads.filter(
        (l) =>
          l.nombre_completo?.toLowerCase().includes(lower) ||
          l.codigo?.toLowerCase().includes(lower) ||
          (l.numero_documento || l.dni || '').toLowerCase().includes(lower) ||
          (l.telefono || '').includes(lower)
      );
    },
    [initialLeads]
  );

  const executeSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        setResults(initialLeads.slice(0, 8));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const localMatches = filterLocalPool(term);
        const res = await crmBackend.buscar({ consulta: term.trim(), tamano: 8 });
        const remoteItems = res.items ?? [];
        const mergedMap = new Map<number, CrmProspect>();
        localMatches.forEach((m) => mergedMap.set(m.id_prospecto, m));
        remoteItems.forEach((r) => mergedMap.set(r.id_prospecto, r));
        setResults(Array.from(mergedMap.values()).slice(0, 8));
      } catch {
        setResults(filterLocalPool(term).slice(0, 8));
      } finally {
        setIsLoading(false);
      }
    },
    [filterLocalPool, initialLeads]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    setIsOpen(true);
    setHighlightedIndex(0);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => void executeSearch(text), 300);
  };

  const handleSelectProspect = (prospect: CrmProspect) => {
    onSelect(prospect);
    setQuery(formatProspectLabel(prospect));
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : -1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        e.preventDefault();
        handleSelectProspect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div className="relative flex items-center">
        <SearchIcon
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={ariaLabel}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            if (results.length === 0) void executeSearch(query);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={INPUT_BASE}
        />
        {isLoading ? (
          <RefreshCw className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-brand-400" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-brand-300 hover:text-brand-600 focus:outline-none"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-brand-200 bg-white py-1 shadow-lg"
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-brand-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Buscando prospectos...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-center text-xs text-brand-400">
              No se encontraron prospectos para su búsqueda.
            </div>
          ) : (
            results.map((prospect, idx) => {
              const isSelected = prospect.id_prospecto === value;
              const isHighlighted = idx === highlightedIndex;
              const docNum = prospect.numero_documento || prospect.dni;
              return (
                <div
                  key={prospect.id_prospecto}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectProspect(prospect)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 px-3 py-1.5 text-left text-xs transition-colors duration-100',
                    isHighlighted ? 'bg-brand-50 text-brand-900 font-medium' : 'text-brand-700 hover:bg-brand-50',
                    isSelected && 'border-l-2 border-brand-600 bg-brand-50/60'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-800">{prospect.nombre_completo}</span>
                    <span className="rounded bg-brand-100/70 px-1.5 py-0.2 text-[10px] font-mono text-brand-600">
                      {prospect.codigo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-brand-400">
                    {docNum && <span>DNI: {docNum}</span>}
                    {prospect.telefono && <span>Tel: {prospect.telefono}</span>}
                    {prospect.estado_nombre && (
                      <span className="ml-auto text-[10px] text-brand-500 font-medium">
                        {prospect.estado_nombre}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
