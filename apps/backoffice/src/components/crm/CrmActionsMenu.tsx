
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { Gate } from '../auth/PermissionRoute';
import type { Permission } from '../../types';

export type CrmMenuAction = {
  label: string; icon: LucideIcon; permission: Permission;
  onClick: () => void; disabled?: boolean; danger?: boolean;
};

export function CrmActionsMenu({ actions, label }: { actions: CrmMenuAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const r = trigger.current.getBoundingClientRect();
    const m = menu.current.getBoundingClientRect();
    setPos({
      top: r.bottom + m.height + 6 < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - m.height - 6),
      left: Math.max(8, Math.min(r.right - m.width, window.innerWidth - m.width - 8))
    });
    menu.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!trigger.current?.contains(n) && !menu.current?.contains(n)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    const close = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" title={label} aria-label={label}
      aria-haspopup="menu" aria-expanded={open}
      onClick={() => setOpen(v => !v)}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 text-brand-600 hover:bg-brand-50">
      <EllipsisVertical className="h-4 w-4" />
    </button>

    {open && createPortal(
      <div ref={menu} role="menu" aria-label={label} style={pos}
        className="fixed z-[9999] max-h-[calc(100vh-16px)] w-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
        {actions.map(a => <Gate key={a.label} permission={a.permission}>
          <button key={a.label} type="button" role="menuitem" disabled={a.disabled}
            onClick={() => { setOpen(false); a.onClick(); }}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${a.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100'}`}>
            <a.icon className="h-4 w-4 shrink-0" />{a.label}
          </button>
        </Gate>)}
      </div>, document.body
    )}
  </>;
}
