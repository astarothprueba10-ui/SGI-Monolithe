import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/* ---------- Badge ---------- */

type BadgeTone = 'green' | 'gold' | 'night' | 'neutral' | 'red';

const badgeTones: Record<BadgeTone, string> = {
  green: 'bg-brand-100 text-brand-700',
  gold: 'bg-gold-100 text-gold-600',
  night: 'bg-night text-white',
  neutral: 'bg-bone text-muted border border-line',
  red: 'bg-red-50 text-red-700'
};

export function Badge({
  tone = 'neutral',
  children,
  className




}: {tone?: BadgeTone;children: React.ReactNode;className?: string;}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
        badgeTones[tone],
        className
      )}>
      
      {children}
    </span>);

}

export function statusTone(status: string): BadgeTone {
  if (status === 'Preventa') return 'gold';
  if (status === 'En venta') return 'green';
  return 'neutral';
}

/* ---------- Section heading ---------- */

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  light?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  light = false,
  className
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}>
      
      {eyebrow &&
      <p className={cn('mb-3 text-sm font-semibold', light ? 'text-gold-400' : 'text-brand')}>
          {eyebrow}
        </p>
      }
      <h2
        className={cn(
          'font-display text-3xl leading-tight sm:text-4xl',
          light ? 'text-white' : 'text-night'
        )}>
        
        {title}
      </h2>
      {description &&
      <p className={cn('mt-4 text-[15px] leading-relaxed', light ? 'text-white/70' : 'text-muted')}>
          {description}
        </p>
      }
    </div>);

}

/* ---------- Breadcrumbs ---------- */

export function Breadcrumbs({
  items,
  light = false



}: {items: {label: string;to?: string;}[];light?: boolean;}) {
  return (
    <nav aria-label="Ruta de navegación">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px]">
        {items.map((item, i) =>
        <li key={item.label} className="flex items-center gap-1.5">
            {item.to ?
          <Link
            to={item.to}
            className={cn(
              'transition-colors duration-150 ease-out',
              light ? 'text-white/60 hover:text-gold-400' : 'text-muted hover:text-brand'
            )}>
            
                {item.label}
              </Link> :

          <span className={cn('font-medium', light ? 'text-white' : 'text-night')}>{item.label}</span>
          }
            {i < items.length - 1 &&
          <ChevronRightIcon className={cn('h-3.5 w-3.5', light ? 'text-white/35' : 'text-muted/50')} />
          }
          </li>
        )}
      </ol>
    </nav>);

}

/* ---------- Tabs ---------- */

interface TabsProps {
  tabs: {id: string;label: string;count?: number;}[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors duration-150 ease-out',
              isActive ?
              'border-night bg-night text-white' :
              'border-line bg-white text-muted hover:border-night/40 hover:text-night'
            )}>
            
            {tab.label}
            {typeof tab.count === 'number' &&
            <span
              className={cn(
                'rounded-full px-1.5 text-[11px]',
                isActive ? 'bg-white/15 text-white' : 'bg-bone text-muted'
              )}>
              
                {tab.count}
              </span>
            }
          </button>);

      })}
    </div>);

}

/* ---------- Modal ---------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-night/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true" />
      
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full overflow-hidden rounded-t-2xl bg-white shadow-lift sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-3xl'
        )}>
        
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="font-display text-xl text-night">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted transition-colors duration-150 ease-out hover:bg-bone hover:text-night">
            
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="max-h-[60vh] overflow-y-auto px-6 py-5">{children}</div>}
        {footer &&
        <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-bone/60 px-6 py-4">
            {footer}
          </div>
        }
      </div>
    </div>);

}