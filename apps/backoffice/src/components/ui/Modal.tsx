import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { IconButton } from './Button';

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width = 'max-w-lg'








}: {open: boolean;onClose: () => void;title: string;description?: string;footer?: React.ReactNode;children: React.ReactNode;width?: string;}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ?
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
          <motion.div
          className="absolute inset-0 bg-brand-950/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className={`relative z-10 w-full ${width} overflow-hidden rounded-lg border border-brand-100 bg-white shadow-pop`}>
          
            <div className="flex items-start justify-between gap-4 border-b border-brand-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-brand-900">{title}</h2>
                {description ?
              <p className="mt-0.5 text-[13px] text-brand-400">{description}</p> :
              null}
              </div>
              <IconButton icon={XIcon} label="Cerrar" onClick={onClose} />
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
            {footer ?
          <div className="flex items-center justify-end gap-2 border-t border-brand-100 bg-brand-50/50 px-5 py-3">
                {footer}
              </div> :
          null}
          </motion.div>
        </div> :
      null}
    </AnimatePresence>);

}