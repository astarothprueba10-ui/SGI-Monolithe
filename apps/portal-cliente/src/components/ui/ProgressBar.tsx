import React from 'react';

type ProgressBarProps = {
  value: number;
  label?: string;
  size?: 'sm' | 'md';
};

export function ProgressBar({ value, label, size = 'md' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'Avance'}
      className={`w-full overflow-hidden rounded-full bg-slateux-200 ${
      size === 'sm' ? 'h-1.5' : 'h-2'}`
      }>
      
      <div
        className="h-full rounded-full bg-ink-800 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }} />
      
    </div>);

}