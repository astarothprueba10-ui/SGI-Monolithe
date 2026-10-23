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
    <div className={`flex items-center gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[12px] text-brand-500 whitespace-nowrap">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-brand-200 bg-white px-2.5 text-[13px] text-brand-800 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none"
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
