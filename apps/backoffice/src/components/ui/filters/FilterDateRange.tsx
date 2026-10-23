interface FilterDateRangeProps {
  idDesde: string;
  idHasta: string;
  labelDesde?: string;
  labelHasta?: string;
  desde: string;
  hasta: string;
  onChangeDesde: (value: string) => void;
  onChangeHasta: (value: string) => void;
  max?: string;
}

export function FilterDateRange({
  idDesde,
  idHasta,
  labelDesde = 'Desde',
  labelHasta = 'Hasta',
  desde,
  hasta,
  onChangeDesde,
  onChangeHasta,
  max
}: FilterDateRangeProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <label htmlFor={idDesde} className="text-[12px] text-brand-500 whitespace-nowrap">
          {labelDesde}
        </label>
        <input
          id={idDesde}
          type="date"
          value={desde}
          max={hasta || max}
          onChange={(e) => onChangeDesde(e.target.value)}
          className="h-9 rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={idHasta} className="text-[12px] text-brand-500 whitespace-nowrap">
          {labelHasta}
        </label>
        <input
          id={idHasta}
          type="date"
          value={hasta}
          min={desde}
          max={max}
          onChange={(e) => onChangeHasta(e.target.value)}
          className="h-9 rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
