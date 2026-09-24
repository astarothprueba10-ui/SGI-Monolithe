import React from 'react';
import { AlertCircleIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

const fieldBase =
'w-full rounded-lg border bg-white px-3.5 text-sm text-ink placeholder:text-muted/60 transition-[border-color,box-shadow] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:bg-bone disabled:text-muted';

function stateClasses(error?: string) {
  return error ?
  'border-red-500 focus:border-red-500 focus:ring-red-500/20' :
  'border-line focus:border-brand';
}

interface LabelWrapProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, hint, error, children, className }: LabelWrapProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-night">
        {label}
        {required && <span className="ml-0.5 text-brand">*</span>}
        {!required && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      {children}
      {error ?
      <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p> :
      hint ?
      <p className="text-xs text-muted">{hint}</p> :
      null}
    </div>);

}

export function Input({
  error,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {error?: string;}) {
  return <input className={cn(fieldBase, 'h-11', stateClasses(error), className)} {...rest} />;
}

export function Textarea({
  error,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {error?: string;}) {
  return (
    <textarea className={cn(fieldBase, 'min-h-[120px] py-3', stateClasses(error), className)} {...rest} />);

}

export function Select({
  error,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {error?: string;}) {
  return (
    <div className="relative">
      <select
        className={cn(fieldBase, 'h-11 appearance-none pr-10', stateClasses(error), className)}
        {...rest}>
        
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true" />
      
    </div>);

}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-muted', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand/30"
        {...rest} />
      
      <span>{label}</span>
    </label>);

}