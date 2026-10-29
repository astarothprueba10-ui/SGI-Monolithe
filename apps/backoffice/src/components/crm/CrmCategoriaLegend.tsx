import { useEffect, useRef, useState } from 'react';

const ITEMS = [
  {
    key: 'LEAD',
    label: 'Leads',
    dot: 'bg-sky-500',
    estados: ['Nuevo', 'Contactado', 'En seguimiento']
  },
  {
    key: 'POTENCIAL',
    label: 'Clientes potenciales',
    dot: 'bg-blue-900',
    estados: ['Interesado', 'En negociación']
  },
  {
    key: 'COMPRADOR',
    label: 'Cliente comprador',
    dot: 'bg-emerald-500',
    estados: [
      'Venta formalizada',
      'Venta: Confirmada / Contratada / Completada',
      'Contrato: Vigente / Finalizado'
    ]
  }
] as const;

export function CrmCategoriaLegend() {
  const [open, setOpen] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative flex flex-wrap items-center justify-end gap-3">
      {ITEMS.map((item) => (
        <div key={item.key} className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => (prev === item.key ? null : item.key))}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
            <span>{item.label}</span>
          </button>

          {open === item.key && (
            <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
              <p className="mb-2 text-xs font-semibold text-brand-900">{item.label}</p>
              <ul className="space-y-1 text-xs text-slate-600">
                {item.estados.map((estado) => (
                  <li key={estado} className="flex gap-2">
                    <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{estado}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}