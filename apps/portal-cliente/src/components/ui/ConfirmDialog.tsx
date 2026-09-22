import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { Button } from './Button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open ?
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
          className="absolute inset-0 bg-ink-900/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={onCancel} />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="relative w-full max-w-md rounded-card border border-slateux-200 bg-white p-6 shadow-card"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          
            <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
            
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>

            <span
            className={[
            'flex h-10 w-10 items-center justify-center rounded-full border',
            tone === 'danger' ?
            'border-danger-200 bg-danger-50 text-danger-500' :
            'border-slateux-200 bg-slateux-50 text-ink-700'].
            join(' ')}>
            
              <AlertTriangleIcon className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2
            id="confirm-title"
            className="mt-4 text-[17px] font-semibold tracking-tight text-ink-800">
            
              {title}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slateux-500">
              {description}
            </p>

            {children ? <div className="mt-4">{children}</div> : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
              variant={tone === 'danger' ? 'danger' : 'primary'}
              onClick={onConfirm}
              loading={loading}>
              
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div> :
      null}
    </AnimatePresence>);

}