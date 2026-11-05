import { useEffect, type ReactNode } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  id: string;
  label: string;
  side?: 'start' | 'end';
}

function useDesktopDismiss(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const close = () => { if (desktop.matches) onClose(); };
    close();
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, [open, onClose]);
}

/** Presenta la navegación móvil con foco contenido, cierre por Escape y fondo bloqueado. */
export function MobileDrawer({ open, onClose, children, id, label, side = 'start' }: MobileDrawerProps) {
  const ref = useModalDialog(open);
  useDesktopDismiss(open, onClose);
  return (
    <dialog ref={ref} id={id} aria-label={label}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClose={event => { if (open && !event.currentTarget.open) onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className={`mobile-drawer fixed m-0 border-0 bg-transparent p-0 text-inherit shadow-xl lg:hidden ${side === 'end' ? 'left-auto right-0' : 'left-0 right-auto'}`}>
      <div className="mobile-drawer-content flex h-full min-h-0 flex-col">{children}</div>
    </dialog>
  );
}
