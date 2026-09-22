import React from 'react';

export function PageHeader({
  title,
  description,
  actions,
  meta





}: {title: string;description?: string;actions?: React.ReactNode;meta?: React.ReactNode;}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-brand-900">
          {title}
        </h1>
        {description ?
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-brand-400">
            {description}
          </p> :
        null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>);

}