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
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
        <label htmlFor={idDesde} className="text-[12px] text-brand-500 whitespace-nowrap">
          {labelDesde}
        </label>
        <input
          id={idDesde}
          type="date"
          value={desde}
          max={hasta || max}
          onChange={(e) => onChangeDesde(e.target.value)}
          className="h-11 w-full min-w-0 rounded-md sm:h-9 sm:w-auto border border-brand-200 bg-white px-2.5 text-[13px] text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
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
          className="h-11 w-full min-w-0 rounded-md sm:h-9 sm:w-auto border border-brand-200 bg-white px-2.5 text-[13px] text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
