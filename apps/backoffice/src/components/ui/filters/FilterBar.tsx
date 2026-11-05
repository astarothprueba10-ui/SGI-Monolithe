import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`filter-bar flex min-w-0 max-w-full flex-wrap items-center gap-3 border-b border-brand-100 px-4 py-3.5 sm:px-5 ${className}`}>
      {children}
    </div>
  );
}
