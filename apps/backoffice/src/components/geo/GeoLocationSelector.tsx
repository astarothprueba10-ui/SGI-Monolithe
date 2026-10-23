import React, { useEffect, useRef, useState } from 'react';
import { SearchIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FieldLabel } from '../ui/Field';
import { coreService, type UbicacionGeograficaResponse } from '../../services/coreService';

export interface GeoLocationValue {
  idPais?: number | null;
  pais?: string;
  idDepartamento?: number | null;
  codigoDepartamento?: string;
  departamento?: string;
  idProvincia?: number | null;
  codigoProvincia?: string;
  provincia?: string;
  idDistrito?: number | null;
  codigoDistrito?: string;
  distrito?: string;
}

export interface GeoLocationSelectorProps {
  value: GeoLocationValue;
  onChange: (value: GeoLocationValue) => void;
  disabled?: boolean;
  errors?: {
    pais?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
  };
  onBlurField?: (field: 'pais' | 'departamento' | 'provincia' | 'distrito') => void;
  defaultCountryName?: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface ComboboxProps {
  id: string;
  label: string;
  placeholder: string;
  items: UbicacionGeograficaResponse[];
  selectedId?: number | null;
  selectedName?: string;
  onSelect: (item: UbicacionGeograficaResponse) => void;
  onClear: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onBlur?: () => void;
  required?: boolean;
}

function useComboboxNavigation(
  filtered: UbicacionGeograficaResponse[],
  onSelect: (item: UbicacionGeograficaResponse) => void,
  setOpen: (open: boolean) => void,
  setSearchText: (text: string) => void,
  selectedName?: string
) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) {
        onSelect(filtered[highlightedIndex]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearchText(selectedName || '');
    }
  }

  return { highlightedIndex, setHighlightedIndex, handleKeyDown };
}

function GeoCombobox({
  id,
  label,
  placeholder,
  items,
  selectedId,
  selectedName,
  onSelect,
  onClear,
  loading = false,
  disabled = false,
  error,
  onBlur,
  required = false
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState(selectedName || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setSearchText(selectedName || '');
  }, [selectedName]);

  const filtered = items.filter((item) => {
    if (!searchText) return true;
    const nSearch = normalize(searchText);
    return normalize(item.nombre).includes(nSearch) || item.codigo.toLowerCase().includes(nSearch);
  });

  const { highlightedIndex, setHighlightedIndex, handleKeyDown } = useComboboxNavigation(
    filtered,
    onSelect,
    setOpen,
    setSearchText,
    selectedName
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCloseAndVerify();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, items, selectedId, selectedName, searchText]);


  function handleCloseAndVerify() {
    // No procesar selectores que ya están cerrados.
    if (!open) return;

    setOpen(false);

    if (!searchText.trim()) {
      if (selectedId != null) onClear();
      setSearchText('');
      onBlur?.();
      return;
    }

    const exact = items.find(
      (item) => normalize(item.nombre) === normalize(searchText)
    );

    if (exact) {
      // No volver a seleccionar una ubicación que ya está seleccionada.
      if (exact.idUbicacion !== selectedId) {
        onSelect(exact);
      }

      setSearchText(exact.nombre);
    } else {
      setSearchText(selectedName || '');
    }

    onBlur?.();
  }


  function handleSelectItem(item: UbicacionGeograficaResponse) {
    onSelect(item);
    setSearchText(item.nombre);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchText(e.target.value);
    setOpen(true);
    setHighlightedIndex(0);
  }

  const baseInputStyle =
    'h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 ease-smooth hover:border-brand-300 focus:border-brand-500 disabled:bg-brand-50/50 disabled:text-brand-400';

  return (
    <div className="relative" ref={containerRef}>
      <FieldLabel htmlFor={id}>
        {label} {required && '*'}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled || loading}
          value={loading ? 'Cargando...' : searchText}
          onChange={handleInputChange}
          onFocus={() => {
            if (!disabled && !loading) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Cargando opciones...' : placeholder}
          className={cn(baseInputStyle, 'pr-16 pl-8', error && 'border-rose-400 focus:border-rose-500')}
          autoComplete="off"
        />
        <SearchIcon
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-300"
          aria-hidden="true"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {selectedId && !disabled && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setSearchText('');
              }}
              className="rounded p-0.5 text-brand-400 hover:text-brand-600"
              title="Limpiar seleccion"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled || loading}
            onClick={() => setOpen((prev) => !prev)}
            className="rounded p-0.5 text-brand-400 hover:text-brand-600"
          >
            <ChevronDownIcon className={cn('h-3.5 w-3.5 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && !disabled && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-brand-200 bg-white py-1 shadow-lg text-[13px]"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-center text-brand-400">Sin coincidencias oficiales</li>
          ) : (
            filtered.map((item, index) => {
              const isSelected = item.idUbicacion === selectedId;
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={item.idUbicacion}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelectItem(item)}
                  className={cn(
                    'cursor-pointer px-3 py-1.5 transition-colors',
                    isHighlighted && 'bg-brand-50 text-brand-900',
                    isSelected && 'font-medium text-brand-700 bg-brand-100/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.nombre}</span>
                    <span className="text-[11px] text-brand-400 font-mono">{item.codigo}</span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function GeoLocationSelector({
  value,
  onChange,
  disabled = false,
  errors = {},
  onBlurField,
  defaultCountryName = 'Perú'
}: GeoLocationSelectorProps) {
  const [paises, setPaises] = useState<UbicacionGeograficaResponse[]>([]);
  const [departamentos, setDepartamentos] = useState<UbicacionGeograficaResponse[]>([]);
  const [provincias, setProvincias] = useState<UbicacionGeograficaResponse[]>([]);
  const [distritos, setDistritos] = useState<UbicacionGeograficaResponse[]>([]);

  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);

  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const seqRef = useRef({ paises: 0, deptos: 0, provs: 0, dists: 0 });

  // 1. Cargar paises al montar
  useEffect(() => {
    let cancelado = false;
    const seq = ++seqRef.current.paises;
    setLoadingPaises(true);
    setErrorCarga(null);

    coreService
      .getUbicaciones()
      .then((data) => {
        if (cancelado || seq !== seqRef.current.paises) return;
        setPaises(data);
        if (value.idPais && !value.pais) {
          // Resolver nombre cuando idPais ya existe pero el nombre no se recibio del backend
          const encontrado = data.find((p) => p.idUbicacion === value.idPais);
          if (encontrado) {
            onChange({ ...value, pais: encontrado.nombre });
          }
        } else if (!value.idPais && defaultCountryName) {
          const paisDefecto = data.find((p) => normalize(p.nombre) === normalize(defaultCountryName));
          if (paisDefecto) {
            onChange({
              ...value,
              idPais: paisDefecto.idUbicacion,
              pais: paisDefecto.nombre,
              idDepartamento: null,
              departamento: '',
              codigoDepartamento: '',
              idProvincia: null,
              provincia: '',
              codigoProvincia: '',
              idDistrito: null,
              distrito: '',
              codigoDistrito: ''
            });
          }
        }
      })
      .catch((err) => {
        if (!cancelado && seq === seqRef.current.paises) {
          setErrorCarga(err instanceof Error ? err.message : 'Error al cargar paises');
        }
      })
      .finally(() => {
        if (!cancelado && seq === seqRef.current.paises) setLoadingPaises(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // 2. Cargar departamentos dependientes del pais
  useEffect(() => {
    if (!value.idPais) {
      setDepartamentos([]);
      return;
    }
    let cancelado = false;
    const seq = ++seqRef.current.deptos;
    setLoadingDepartamentos(true);

    coreService
      .getUbicaciones(value.idPais)
      .then((data) => {
        if (!cancelado && seq === seqRef.current.deptos) setDepartamentos(data);
      })
      .catch((err) => {
        if (!cancelado && seq === seqRef.current.deptos) {
          setErrorCarga(err instanceof Error ? err.message : 'Error al cargar departamentos');
        }
      })
      .finally(() => {
        if (!cancelado && seq === seqRef.current.deptos) setLoadingDepartamentos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [value.idPais]);

  // 3. Cargar provincias dependientes del departamento
  useEffect(() => {
    if (!value.idDepartamento) {
      setProvincias([]);
      return;
    }
    let cancelado = false;
    const seq = ++seqRef.current.provs;
    setLoadingProvincias(true);

    coreService
      .getUbicaciones(value.idDepartamento)
      .then((data) => {
        if (!cancelado && seq === seqRef.current.provs) setProvincias(data);
      })
      .catch((err) => {
        if (!cancelado && seq === seqRef.current.provs) {
          setErrorCarga(err instanceof Error ? err.message : 'Error al cargar provincias');
        }
      })
      .finally(() => {
        if (!cancelado && seq === seqRef.current.provs) setLoadingProvincias(false);
      });

    return () => {
      cancelado = true;
    };
  }, [value.idDepartamento]);

  // 4. Cargar distritos dependientes de la provincia
  useEffect(() => {
    if (!value.idProvincia) {
      setDistritos([]);
      return;
    }
    let cancelado = false;
    const seq = ++seqRef.current.dists;
    setLoadingDistritos(true);

    coreService
      .getUbicaciones(value.idProvincia)
      .then((data) => {
        if (!cancelado && seq === seqRef.current.dists) setDistritos(data);
      })
      .catch((err) => {
        if (!cancelado && seq === seqRef.current.dists) {
          setErrorCarga(err instanceof Error ? err.message : 'Error al cargar distritos');
        }
      })
      .finally(() => {
        if (!cancelado && seq === seqRef.current.dists) setLoadingDistritos(false);
      });

    return () => {
      cancelado = true;
    };
  }, [value.idProvincia]);

  function handleSelectPais(item: UbicacionGeograficaResponse) {
    onChange({
      idPais: item.idUbicacion,
      pais: item.nombre,
      idDepartamento: null,
      departamento: '',
      codigoDepartamento: '',
      idProvincia: null,
      provincia: '',
      codigoProvincia: '',
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleClearPais() {
    onChange({
      idPais: null,
      pais: '',
      idDepartamento: null,
      departamento: '',
      codigoDepartamento: '',
      idProvincia: null,
      provincia: '',
      codigoProvincia: '',
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleSelectDepartamento(item: UbicacionGeograficaResponse) {
    onChange({
      ...value,
      idDepartamento: item.idUbicacion,
      departamento: item.nombre,
      codigoDepartamento: item.codigo,
      idProvincia: null,
      provincia: '',
      codigoProvincia: '',
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleClearDepartamento() {
    onChange({
      ...value,
      idDepartamento: null,
      departamento: '',
      codigoDepartamento: '',
      idProvincia: null,
      provincia: '',
      codigoProvincia: '',
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleSelectProvincia(item: UbicacionGeograficaResponse) {
    onChange({
      ...value,
      idProvincia: item.idUbicacion,
      provincia: item.nombre,
      codigoProvincia: item.codigo,
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleClearProvincia() {
    onChange({
      ...value,
      idProvincia: null,
      provincia: '',
      codigoProvincia: '',
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  function handleSelectDistrito(item: UbicacionGeograficaResponse) {
    onChange({
      ...value,
      idDistrito: item.idUbicacion,
      distrito: item.nombre,
      codigoDistrito: item.codigo
    });
  }

  function handleClearDistrito() {
    onChange({
      ...value,
      idDistrito: null,
      distrito: '',
      codigoDistrito: ''
    });
  }

  return (
    <div className="space-y-4">
      {errorCarga && (
        <div className="rounded-md bg-rose-50 p-2.5 text-xs text-rose-700">
          {errorCarga}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <GeoCombobox
          id="geo-pais"
          label="Pais"
          placeholder="Seleccionar pais"
          items={paises}
          selectedId={value.idPais}
          selectedName={value.pais}
          onSelect={handleSelectPais}
          onClear={handleClearPais}
          loading={loadingPaises}
          disabled={disabled}
          error={errors.pais}
          onBlur={() => onBlurField?.('pais')}
          required
        />
        <GeoCombobox
          id="geo-departamento"
          label="Departamento"
          placeholder={value.idPais ? 'Seleccionar departamento' : 'Primero selecciona pais'}
          items={departamentos}
          selectedId={value.idDepartamento}
          selectedName={value.departamento}
          onSelect={handleSelectDepartamento}
          onClear={handleClearDepartamento}
          loading={loadingDepartamentos}
          disabled={disabled || !value.idPais}
          error={errors.departamento}
          onBlur={() => onBlurField?.('departamento')}
          required
        />
        <GeoCombobox
          id="geo-provincia"
          label="Provincia"
          placeholder={value.idDepartamento ? 'Seleccionar provincia' : 'Primero selecciona departamento'}
          items={provincias}
          selectedId={value.idProvincia}
          selectedName={value.provincia}
          onSelect={handleSelectProvincia}
          onClear={handleClearProvincia}
          loading={loadingProvincias}
          disabled={disabled || !value.idDepartamento}
          error={errors.provincia}
          onBlur={() => onBlurField?.('provincia')}
          required
        />
        <GeoCombobox
          id="geo-distrito"
          label="Distrito"
          placeholder={value.idProvincia ? 'Seleccionar distrito' : 'Primero selecciona provincia'}
          items={distritos}
          selectedId={value.idDistrito}
          selectedName={value.distrito}
          onSelect={handleSelectDistrito}
          onClear={handleClearDistrito}
          loading={loadingDistritos}
          disabled={disabled || !value.idProvincia}
          error={errors.distrito}
          onBlur={() => onBlurField?.('distrito')}
          required
        />
      </div>
    </div>
  );
}
