import type { ReactNode } from 'react';
import { XIcon } from 'lucide-react';
import { IconButton } from './Button';
import { useModalDialog } from '../../hooks/useModalDialog';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
  width?: string;
}

function ModalPanel({ title, description, children, footer, onClose, width = 'max-w-lg' }: ModalProps) {
  return (
    <div className={`dialog-panel relative flex w-full flex-col overflow-hidden rounded-lg border border-brand-100 bg-white shadow-pop ${width}`}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-100 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-brand-900">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-brand-400">{description}</p>}
        </div>
        <IconButton icon={XIcon} label="Cerrar" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>
      {footer && <div className="dialog-actions flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-brand-100 bg-brand-50/50 px-4 py-3 sm:px-5">{footer}</div>}
    </div>
  );
}

/** Mantiene el formulario y sus acciones accesibles dentro del área visible del dispositivo. */
export function Modal(props: ModalProps) {
  const ref = useModalDialog(props.open);
  return (
    <dialog ref={ref} aria-label={props.title} className="viewport-dialog"
      onCancel={event => { event.preventDefault(); props.onClose(); }}
      onClose={event => { if (props.open && !event.currentTarget.open) props.onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) props.onClose(); }}>
      {props.open && <ModalPanel {...props} />}
    </dialog>
  );
}
