import React from 'react';
import { SearchIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

const BASE =
'h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-[13px] text-brand-800 placeholder:text-brand-300 transition-colors duration-150 ease-smooth hover:border-brand-300 focus:border-brand-500';

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(BASE, 'pr-8', className)} {...props}>
      {children}
    </select>);

}

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar…',
  className,
  label






}: {value: string;onValueChange: (value: string) => void;placeholder?: string;className?: string;label?: string;}) {
  return (
    <div className={cn('relative', className)}>
      <SearchIcon
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-300"
        aria-hidden="true" />
      
      <input
        type="search"
        aria-label={label ?? placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(BASE, 'pl-8')} />
      
    </div>);

}

export function FieldLabel({
  children,
  htmlFor



}: {children: React.ReactNode;htmlFor?: string;}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[12px] font-medium text-brand-500">
      
      {children}
    </label>);

}