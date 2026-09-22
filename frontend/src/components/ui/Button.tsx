import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'gold' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold tracking-tight transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brand-700 active:translate-y-px',
  secondary:
  'border border-night/20 bg-white text-night hover:border-night hover:bg-night hover:text-white active:translate-y-px',
  gold: 'bg-gold text-night hover:bg-gold-600 hover:text-white active:translate-y-px',
  ghost: 'text-night hover:bg-night/5 active:translate-y-px',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:translate-y-px'
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'px-7 py-3.5 text-[15px]'
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonProps = CommonProps &
Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}>
      
      {loading && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>);

}

interface LinkButtonProps extends CommonProps {
  to: string;
  onClick?: () => void;
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
  onClick
}: LinkButtonProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(base, variants[variant], sizes[size], className)}>
      
      {children}
    </Link>);

}

interface AnchorButtonProps extends CommonProps {
  href: string;
  target?: string;
}

export function AnchorButton({
  href,
  target,
  variant = 'primary',
  size = 'md',
  className,
  children
}: AnchorButtonProps) {
  return (
    <a
      href={href}
      target={target}
      rel={target === '_blank' ? 'noreferrer' : undefined}
      className={cn(base, variants[variant], sizes[size], className)}>
      
      {children}
    </a>);

}