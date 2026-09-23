import React from 'react';
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  XCircleIcon,
  XIcon } from
'lucide-react';
import { cn } from '../../utils/cn';

type Tone = 'success' | 'error' | 'warning' | 'info';

const toneMap: Record<Tone, {wrap: string;icon: React.ComponentType<{className?: string;}>;}> = {
  success: { wrap: 'border-brand/30 bg-brand-50 text-brand-700', icon: CheckCircle2Icon },
  error: { wrap: 'border-red-200 bg-red-50 text-red-700', icon: XCircleIcon },
  warning: { wrap: 'border-gold/40 bg-gold-100 text-gold-600', icon: AlertTriangleIcon },
  info: { wrap: 'border-night/15 bg-bone text-night', icon: InfoIcon }
};

interface AlertProps {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ tone = 'info', title, children, onClose, className }: AlertProps) {
  const { wrap, icon: IconCmp } = toneMap[tone];
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-xl border p-4', wrap, className)}>
      <IconCmp className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
      </div>
      {onClose &&
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar mensaje"
        className="rounded p-1 transition-colors duration-150 ease-out hover:bg-black/5">
        
          <XIcon className="h-4 w-4" />
        </button>
      }
    </div>);

}

export function Spinner({ className }: {className?: string;}) {
  return <Loader2Icon className={cn('h-5 w-5 animate-spin text-brand', className)} aria-hidden="true" />;
}

export function LoadingBlock({ label = 'Cargando…' }: {label?: string;}) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-white py-14 text-sm text-muted">
      <Spinner />
      {label}
    </div>);

}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="h-52 animate-pulse bg-bone" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-bone" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-bone" />
        <div className="h-3 w-full animate-pulse rounded bg-bone" />
      </div>
    </div>);

}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-bone/60 px-6 py-16 text-center',
        className
      )}>
      
      {icon && <div className="mb-4 text-gold">{icon}</div>}
      <h3 className="font-display text-xl text-night">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>);

}