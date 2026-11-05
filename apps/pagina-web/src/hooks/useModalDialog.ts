import { useEffect, useRef } from 'react';

let scrollLocks = 0;
let previousOverflow = '';
let previousRootOverflow = '';

function lockPageScroll(): () => void {
  if (scrollLocks++ === 0) {
    previousOverflow = document.body.style.overflow;
    previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  return () => {
    if (--scrollLocks === 0) {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    }
  };
}

function observeViewport(dialog: HTMLDialogElement): () => void {
  const viewport = window.visualViewport;
  const update = () => {
    dialog.style.setProperty('--dialog-height', `${viewport?.height ?? window.innerHeight}px`);
    dialog.style.setProperty('--dialog-top', `${viewport?.offsetTop ?? 0}px`);
  };
  update();
  viewport?.addEventListener('resize', update);
  viewport?.addEventListener('scroll', update);
  window.addEventListener('resize', update);
  return () => {
    viewport?.removeEventListener('resize', update);
    viewport?.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}

/** Mantiene el diálogo dentro del área visible y restaura el desplazamiento al cerrar. */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    if (!dialog.open) dialog.showModal();
    const unlock = lockPageScroll();
    const unobserve = observeViewport(dialog);
    return () => {
      unobserve();
      if (dialog.open) dialog.close();
      unlock();
    };
  }, [open]);
  return ref;
}
