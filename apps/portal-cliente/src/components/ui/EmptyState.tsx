import React from 'react';

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slateux-200 bg-slateux-50 text-slateux-400">
        {icon}
      </span>
      <p className="mt-4 text-[14.5px] font-semibold text-ink-800">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slateux-500">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>);

}