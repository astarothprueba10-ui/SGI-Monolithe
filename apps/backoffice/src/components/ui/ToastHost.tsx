import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

function useToastHost() {
  const [host] = useState(() => document.createElement('div'));
  useEffect(() => {
    const update = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'));
      const target = document.activeElement?.closest('dialog[open]') ?? dialogs[dialogs.length - 1] ?? document.body;
      if (host.parentElement !== target) target.appendChild(host);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
    return () => { observer.disconnect(); host.remove(); };
  }, [host]);
  return host;
}

/** Conserva los avisos sobre el diálogo activo sin reiniciar su estado al abrirlo o cerrarlo. */
export function ToastHost() {
  const host = useToastHost();
  return createPortal(<Toaster position="bottom-right" toastOptions={{ style: {
    borderRadius: '8px', border: '1px solid #E5EDF5', fontSize: '13px', color: '#152B45'
  } }} />, host);
}
