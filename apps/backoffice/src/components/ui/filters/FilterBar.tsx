import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5 ${className}`}>
      {children}
    </div>
  );
}
