import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export function Dropdown({
  trigger,
  children,
  align = 'right',
  width = 'w-56'





}: {trigger: (props: {open: boolean;toggle: () => void;}) => React.ReactNode;children: (props: {close: () => void;}) => React.ReactNode;align?: 'left' | 'right';width?: string;}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open ?
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'absolute z-40 mt-2 overflow-hidden rounded-lg border border-brand-100 bg-white py-1 shadow-pop',
            width,
            align === 'right' ? 'right-0' : 'left-0'
          )}>
          
            {children({ close: () => setOpen(false) })}
          </motion.div> :
        null}
      </AnimatePresence>
    </div>);

}

export function DropdownItem({
  children,
  onClick,
  tone = 'default',
  icon: Icon





}: {children: React.ReactNode;onClick?: () => void;tone?: 'default' | 'danger';icon?: React.ComponentType<{className?: string;}>;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors duration-150 ease-smooth',
        tone === 'danger' ?
        'text-rose-600 hover:bg-rose-50' :
        'text-brand-700 hover:bg-brand-50'
      )}>
      
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
    </button>);

}

export function DropdownLabel({ children }: {children: React.ReactNode;}) {
  return (
    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-300">
      {children}
    </p>);

}