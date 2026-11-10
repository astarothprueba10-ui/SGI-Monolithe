import React from 'react';
import { useHorizontalOverflow } from '../../hooks/useHorizontalOverflow';
import { cn } from '../../utils/cn';

type CellProps = { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string };

function columns(head: React.ReactNode): number {
  return React.Children.toArray(head).reduce<number>((total, child) => {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return total;
    return total + (child.type === React.Fragment ? columns(child.props.children) : 1);
  }, 0);
}

/** Tabla con anchos legibles y desplazamiento confinado a su propio contenedor. */
export function Table({ head, children, className }: { head: React.ReactNode; children: React.ReactNode; className?: string }) {
  const { ref, overflow } = useHorizontalOverflow();
  return <div className={cn('w-full min-w-0 max-w-full', className)}>
    {overflow && <p className="px-4 py-2 text-[11px] text-brand-500">Desplaza la tabla horizontalmente para ver todas las columnas.</p>}
    <div ref={ref} className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain"
      role="region" aria-label="Tabla de datos: desplázate horizontalmente para ver todas las columnas" tabIndex={0}>
      <table className="w-full min-w-[var(--table-min-width)] table-auto border-collapse text-left text-[13px]"
        style={{ '--table-min-width': `${Math.max(22, columns(head) * 8)}rem` } as React.CSSProperties}>
        <thead className="bg-brand-50/60"><tr className="border-b border-brand-100">{head}</tr></thead>
        <tbody className="divide-y divide-brand-50">{children}</tbody>
      </table>
    </div>
  </div>;
}

/** Cabecera de columna que conserva palabras y alineación. */
export function TH({ children, align = 'left', className }: CellProps) {
  return <th scope="col" className={cn('whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-400',
    align === 'right' && 'text-right', align === 'center' && 'text-center', className)}>{children}</th>;
}

/** Fila de datos con resaltado opcional y acción existente. */
export function TR({ children, onClick, selected, className }: { children: React.ReactNode; onClick?: () => void; selected?: boolean; className?: string }) {
  return <tr onClick={onClick} className={cn('transition-colors duration-150 ease-smooth',
    onClick && 'cursor-pointer hover:bg-brand-50/70', selected && 'bg-brand-50', className)}>{children}</tr>;
}

/** Celda que permite saltos entre palabras y conserva números alineados. */
export function TD({ children, align = 'left', className }: CellProps) {
  return <td className={cn('px-4 py-3 align-middle text-brand-700', align === 'right' && 'text-right tabular',
    align === 'center' && 'text-center', className)}>{children}</td>;
}
