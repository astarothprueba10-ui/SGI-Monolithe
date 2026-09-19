import React from "react";
import { AlertTriangleIcon, InboxIcon, InfoIcon, CheckCircle2Icon, BoxIcon } from "lucide-react";
import { cn } from "../../utils/cn";
const TONES = {
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: 'text-sky-600',
    Icon: InfoIcon
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-600',
    Icon: AlertTriangleIcon
  },
  danger: {
    wrap: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: 'text-rose-600',
    Icon: AlertTriangleIcon
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: 'text-emerald-600',
    Icon: CheckCircle2Icon
  }
} as const;
export function Alert({
  tone = 'info',
  title,
  children,
  actions,
  className






}: {tone?: keyof typeof TONES;title: string;children?: React.ReactNode;actions?: React.ReactNode;className?: string;}) {
  const t = TONES[tone];
  return <div className={cn('flex gap-3 rounded-lg border px-4 py-3', t.wrap, className)}>
      <t.Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-[13px] opacity-90">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>;
}
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action





}: {title: string;description?: string;icon?: BoxIcon;action?: React.ReactNode;}) {
  return <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-brand-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-[13px] text-brand-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>;
}