import React from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, BoxIcon } from "lucide-react";
import { cn } from "../../utils/cn";
export interface Kpi {
  id: string;
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: BoxIcon;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky';
}
const TONES: Record<NonNullable<Kpi['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600'
};
export function KpiCard({
  kpi,
  featured = false



}: {kpi: Kpi;featured?: boolean;}) {
  const Icon = kpi.icon;
  return <div className={cn('rounded-lg border bg-white p-4 shadow-card', featured ? 'border-brand-200 bg-brand-900 text-white' : 'border-brand-100')}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn('text-[12px] font-medium', featured ? 'text-brand-200' : 'text-brand-400')}>
          {kpi.label}
        </p>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', featured ? 'bg-white/10 text-accent-300' : TONES[kpi.tone ?? 'brand'])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={cn('mt-3 tabular font-semibold tracking-[-0.02em]', featured ? 'text-[30px] leading-9' : 'text-[22px] leading-7 text-brand-900')}>
        {kpi.value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {typeof kpi.delta === 'number' ? <span className={cn('inline-flex items-center gap-0.5 text-[12px] font-medium tabular', kpi.delta >= 0 ? featured ? 'text-emerald-300' : 'text-emerald-600' : featured ? 'text-rose-300' : 'text-rose-600')}>
            {kpi.delta >= 0 ? <ArrowUpRightIcon className="h-3.5 w-3.5" /> : <ArrowDownRightIcon className="h-3.5 w-3.5" />}
            {Math.abs(kpi.delta)}%
          </span> : null}
        {kpi.hint ? <span className={cn('text-[12px]', featured ? 'text-brand-300' : 'text-brand-400')}>
            {kpi.hint}
          </span> : null}
      </div>
    </div>;
}