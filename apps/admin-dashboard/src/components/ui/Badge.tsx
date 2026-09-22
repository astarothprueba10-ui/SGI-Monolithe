import React from 'react';
import { cn } from '../../utils/cn';
import type { StatusToken } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  Disponible: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Separado: 'bg-amber-50 text-amber-800 border-amber-200',
  Vendido: 'bg-brand-100 text-brand-800 border-brand-200',
  Pagado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  Vencido: 'bg-rose-50 text-rose-700 border-rose-200',
  'En revisión': 'bg-sky-50 text-sky-700 border-sky-200',
  Aprobado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rechazado: 'bg-rose-50 text-rose-700 border-rose-200',
  Activo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Inactivo: 'bg-slate-100 text-slate-600 border-slate-200',
  Firmado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Éxito: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Denegado: 'bg-rose-50 text-rose-700 border-rose-200',
  Error: 'bg-rose-50 text-rose-700 border-rose-200'
};

const DOT_STYLES: Record<string, string> = {
  Disponible: 'bg-emerald-500',
  Separado: 'bg-amber-500',
  Vendido: 'bg-brand-600',
  Pagado: 'bg-emerald-500',
  Pendiente: 'bg-amber-500',
  Vencido: 'bg-rose-500',
  'En revisión': 'bg-sky-500',
  Aprobado: 'bg-emerald-500',
  Rechazado: 'bg-rose-500',
  Activo: 'bg-emerald-500',
  Inactivo: 'bg-slate-400'
};

export function StatusBadge({
  status,
  dot = true,
  className




}: {status: StatusToken | string;dot?: boolean;className?: string;}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border-slate-200',
        className
      )}>
      
      {dot && DOT_STYLES[status] ?
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_STYLES[status])} aria-hidden="true" /> :
      null}
      {status}
    </span>);

}

export function Badge({
  children,
  tone = 'neutral',
  className




}: {children: React.ReactNode;tone?: 'neutral' | 'brand' | 'accent' | 'info';className?: string;}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    accent: 'bg-accent-100 text-accent-600 border-accent-300',
    info: 'bg-sky-50 text-sky-700 border-sky-200'
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className
      )}>
      
      {children}
    </span>);

}