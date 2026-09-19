import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange





}: {page: number;pageSize: number;total: number;onPageChange: (page: number) => void;}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 px-5 py-3">
      <p className="text-[12px] text-brand-400 tabular">
        Mostrando {from}–{to} de {total} registros
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 text-brand-500 transition-colors duration-150 ease-smooth hover:bg-brand-50 disabled:opacity-40">
          
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).
        filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1).
        map((p, idx, arr) =>
        <React.Fragment key={p}>
              {idx > 0 && p - arr[idx - 1] > 1 ?
          <span className="px-1 text-brand-300">…</span> :
          null}
              <button
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[13px] tabular transition-colors duration-150 ease-smooth',
              p === page ?
              'border-brand-700 bg-brand-700 text-white' :
              'border-brand-200 text-brand-600 hover:bg-brand-50'
            )}>
            
                {p}
              </button>
            </React.Fragment>
        )}
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-brand-200 text-brand-500 transition-colors duration-150 ease-smooth hover:bg-brand-50 disabled:opacity-40">
          
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>);

}