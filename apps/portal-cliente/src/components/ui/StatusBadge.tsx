import React from 'react';

export type StatusTone = 'success' | 'warn' | 'danger' | 'neutral' | 'info';

const tones: Record<StatusTone, string> = {
  success: 'border-success-200 bg-success-50 text-success-700',
  warn: 'border-warn-200 bg-warn-50 text-warn-700',
  danger: 'border-danger-200 bg-danger-50 text-danger-700',
  neutral: 'border-slateux-200 bg-slateux-50 text-slateux-600',
  info: 'border-ink-800/15 bg-ink-800/[0.04] text-ink-700'
};

const dots: Record<StatusTone, string> = {
  success: 'bg-success-500',
  warn: 'bg-warn-500',
  danger: 'bg-danger-500',
  neutral: 'bg-slateux-400',
  info: 'bg-ink-700'
};

type StatusBadgeProps = {
  tone: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
};

export function StatusBadge({ tone, children, dot = true }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-medium ${tones[tone]}`}>
      
      {dot ?
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`}
        aria-hidden="true" /> :

      null}
      {children}
    </span>);

}