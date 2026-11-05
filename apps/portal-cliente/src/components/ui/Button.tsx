import React from 'react';
import { LoaderCircleIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
  'bg-ink-800 text-white hover:bg-ink-700 focus-visible:ring-ink-700/25 disabled:bg-ink-800/60',
  secondary:
  'border border-slateux-300 bg-white text-ink-700 hover:border-slateux-400 hover:bg-slateux-50 focus-visible:ring-ink-700/20 disabled:text-slateux-400',
  ghost:
  'text-ink-700 hover:bg-slateux-100 focus-visible:ring-ink-700/20 disabled:text-slateux-400',
  danger:
  'bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500/30 disabled:bg-danger-500/60'
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-3 py-2 text-[13px] gap-1.5 sm:min-h-0 sm:h-9 sm:py-0',
  md: 'min-h-11 px-4 py-2 text-[14px] gap-2 sm:min-h-0 sm:h-10 sm:py-0'
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
      'inline-flex min-w-0 max-w-full items-center justify-center rounded-field font-semibold outline-none',
      'transition-[background-color,border-color,color] duration-150 ease-out',
      'focus-visible:ring-4 disabled:cursor-not-allowed',
      variants[variant],
      sizes[size],
      className].
      join(' ')}
      {...props}>
      
      {loading ?
      <LoaderCircleIcon
        className="h-4 w-4 animate-spin"
        aria-hidden="true" /> :


      icon
      }
      {children}
    </button>);

}
