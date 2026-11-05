import React from 'react';
import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { useModalDialog } from '../../hooks/useModalDialog';
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

function ConfirmContent({ title, description, tone, children }: ConfirmDialogProps) {
  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
    <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${tone === 'danger'
      ? 'border-danger-200 bg-danger-50 text-danger-500' : 'border-slateux-200 bg-slateux-50 text-ink-700'}`}>
      <AlertTriangleIcon className="h-5 w-5" aria-hidden="true" />
    </span>
    <h2 className="mt-4 pr-8 text-[17px] font-semibold tracking-tight text-ink-800">{title}</h2>
    <p className="mt-1.5 text-[13.5px] leading-relaxed text-slateux-500">{description}</p>
    {children && <div className="mt-4">{children}</div>}
  </div>;
}

function ConfirmActions({ onCancel, loading, cancelLabel = 'Cancelar', tone, onConfirm, confirmLabel }: ConfirmDialogProps) {
  return <div className="dialog-actions flex shrink-0 flex-col-reverse gap-2 border-t border-slateux-200 p-4 sm:flex-row sm:justify-end">
    <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
    <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
      {confirmLabel}
    </Button>
  </div>;
}

/** Muestra una confirmación accesible y ajustada al área visible del dispositivo. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const ref = useModalDialog(props.open);
  return <dialog ref={ref} aria-label={props.title} className="viewport-dialog"
    onCancel={event => { event.preventDefault(); props.onCancel(); }}
    onClose={event => { if (props.open && !event.currentTarget.open) props.onCancel(); }}
    onClick={event => { if (event.target === event.currentTarget) props.onCancel(); }}>
    {props.open && <div className="dialog-panel relative flex w-full max-w-md flex-col overflow-hidden rounded-card border border-slateux-200 bg-white shadow-card">
      <button type="button" onClick={props.onCancel} aria-label="Cerrar"
        className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-md text-slateux-400 hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <ConfirmContent {...props} />
      <ConfirmActions {...props} />
    </div>}
  </dialog>;
}
