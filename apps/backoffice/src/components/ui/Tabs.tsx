import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  className





}: {items: TabItem[];active: string;onChange: (id: string) => void;className?: string;}) {
  return (
    <div
      role="tablist"
      aria-label="Secciones del módulo"
      className={cn('flex items-center gap-1 border-b border-brand-100', className)}>
      
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 ease-smooth',
              isActive ?
              'border-brand-700 text-brand-900' :
              'border-transparent text-brand-400 hover:text-brand-700'
            )}>
            
            {item.label}
            {typeof item.count === 'number' ?
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] tabular',
                isActive ? 'bg-brand-100 text-brand-700' : 'bg-brand-50 text-brand-400'
              )}>
              
                {item.count}
              </span> :
            null}
          </button>);

      })}
    </div>);

}