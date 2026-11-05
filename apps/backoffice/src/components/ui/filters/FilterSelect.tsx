interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  className = ''
}: FilterSelectProps) {
  return (
    <div className={`flex min-w-0 max-w-full flex-col items-stretch gap-1.5 sm:flex-row sm:items-center ${className}`}>
      <label htmlFor={id} className="text-[12px] text-brand-500 whitespace-nowrap">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-0 max-w-full rounded-md border border-brand-200 bg-white px-2.5 text-base text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none sm:h-9 sm:text-[13px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
