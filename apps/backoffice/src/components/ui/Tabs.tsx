import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigationSection } from '../../hooks/useNavigationTrail';
import { cn } from '../../utils/cn';

/** Sección del módulo y total opcional; null representa un conteo pendiente. */
export interface TabItem { id: string; label: string; count?: number | null }
type Props = { items: TabItem[]; active: string; onChange: (id: string) => void; className?: string };

function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number, props: Props) {
  const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!delta && !['Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? props.items.length - 1 : (index + delta + props.items.length) % props.items.length;
  props.onChange(props.items[next].id);
  (event.currentTarget.parentElement?.children[next] as HTMLButtonElement | undefined)?.focus({ preventScroll: true });
}

function useVisibleTab(active: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; const selected = root?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!root || !selected) return;
    const left = selected.getBoundingClientRect().left - root.getBoundingClientRect().left;
    if (left < 0) root.scrollLeft += left;
    else if (left + selected.offsetWidth > root.clientWidth) root.scrollLeft += left + selected.offsetWidth - root.clientWidth;
  }, [active]);
  return ref;
}

function TabButton({ item, index, props }: { item: TabItem; index: number; props: Props }) {
  const selected = item.id === props.active;
  return <button role="tab" type="button" aria-selected={selected} tabIndex={selected ? 0 : -1}
    onClick={() => props.onChange(item.id)} onKeyDown={event => moveTab(event, index, props)}
    className={cn('inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2.5 text-[13px] font-medium',
      selected ? 'border-[#4cbb17] bg-brand-50/80 font-semibold text-brand-950' : 'border-transparent text-brand-400 hover:bg-brand-50/40 hover:text-brand-700')}>
    {item.label}{item.count !== undefined && <span className={cn('rounded px-1.5 py-0.5 text-[11px] tabular',
      selected ? 'bg-brand-100 font-semibold text-brand-800' : 'bg-brand-50 text-brand-400')}
      aria-label={item.count === null ? 'Contando registros' : `${item.count} registros`}>{item.count === null ? '…' : item.count}</span>}
  </button>;
}

/** Pestañas accesibles que mantienen visible la sección activa y actualizan la ruta. */
export function Tabs(props: Props) {
  useNavigationSection(props.items.find(item => item.id === props.active)?.label ?? '');
  const ref = useVisibleTab(props.active);
  return <div ref={ref} role="tablist" aria-label="Secciones del módulo"
    className={cn('flex min-w-0 max-w-full items-center gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-brand-100', props.className)}>
    {props.items.map((item, index) => <TabButton key={item.id} item={item} index={index} props={props} />)}
  </div>;
}
