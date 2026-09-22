import React, { forwardRef } from "react";
import { BoxIcon } from "lucide-react";
type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  icon?: BoxIcon;
  invalid?: boolean;
  trailing?: React.ReactNode;
  labelAction?: React.ReactNode;
};
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({
  label,
  id,
  icon: Icon,
  invalid = false,
  trailing,
  labelAction,
  ...props
}, ref) {
  return <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-[13px] font-medium text-ink-700">
            {label}
          </label>
          {labelAction}
        </div>
        <div className="relative">
          {Icon ? <Icon className={['pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2', invalid ? 'text-danger-500' : 'text-slateux-400'].join(' ')} aria-hidden="true" /> : null}
          <input ref={ref} id={id} aria-invalid={invalid || undefined} className={['h-11 w-full rounded-field border bg-white text-[15px] text-ink-800 shadow-field', 'placeholder:text-slateux-400', 'outline-none transition-[border-color,box-shadow] duration-150 ease-out', Icon ? 'pl-11' : 'pl-3.5', trailing ? 'pr-11' : 'pr-3.5', invalid ? 'border-danger-500 focus:border-danger-500 focus:ring-4 focus:ring-danger-500/15' : 'border-slateux-200 hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10'].join(' ')} {...props} />
          {trailing ? <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              {trailing}
            </div> : null}
        </div>
      </div>;
});