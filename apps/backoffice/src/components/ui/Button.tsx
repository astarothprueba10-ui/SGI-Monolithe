import React from "react";
import { cn } from "../../utils/cn";
import type { LucideIcon } from "lucide-react";
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 border border-transparent disabled:bg-brand-300',
  secondary: 'bg-white text-brand-800 border border-brand-200 hover:bg-brand-50 hover:border-brand-300',
  ghost: 'bg-transparent text-brand-600 border border-transparent hover:bg-brand-50',
  danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
  success: 'bg-emerald-600 text-white border border-transparent hover:bg-emerald-700'
};
const SIZES: Record<Size, string> = {
  sm: 'min-h-11 px-2.5 py-2 text-[13px] gap-1.5 rounded-md sm:min-h-0 sm:h-8 sm:py-0',
  md: 'min-h-11 px-3.5 py-2 text-sm gap-2 rounded-md sm:min-h-0 sm:h-9 sm:py-0'
};
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  ...props
}: ButtonProps) {
  return <button type="button" className={cn('inline-flex min-w-0 max-w-full items-center justify-center font-medium transition-colors duration-150 ease-smooth disabled:cursor-not-allowed disabled:opacity-60', VARIANTS[variant], SIZES[size], className)} {...props}>
    {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    {children ? <span className="min-w-0 whitespace-normal sm:whitespace-nowrap">{children}</span> : null}
    {IconRight ? <IconRight className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
  </button>;
}
export function IconButton({
  icon: Icon,
  label,
  className,
  ...props



}: {icon: LucideIcon; label: string;} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" aria-label={label} title={label} className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-transparent text-brand-500 transition-colors duration-150 ease-smooth hover:bg-brand-50 hover:text-brand-800 sm:h-8 sm:w-8', className)} {...props}>
    <Icon className="h-4 w-4" aria-hidden="true" />
  </button>;
}
