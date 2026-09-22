import React from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ?
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-500">
            {eyebrow}
          </p> :
        null}
        <h1 className="mt-1.5 text-[1.6rem] font-semibold leading-tight tracking-tight text-ink-800">
          {title}
        </h1>
        {description ?
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slateux-500">
            {description}
          </p> :
        null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>);

}