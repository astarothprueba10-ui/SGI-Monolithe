import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
};

export function Card({ children, className = '', as = 'div' }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-card border border-slateux-200 bg-white shadow-card ${className}`}>
      
      {children}
    </Tag>);

}

type CardHeaderProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};

export function CardHeader({
  title,
  description,
  icon,
  action
}: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slateux-200 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="mt-0.5 text-slateux-400">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink-800">
            {title}
          </h2>
          {description ?
          <p className="mt-0.5 text-[13px] leading-relaxed text-slateux-500">
              {description}
            </p> :
          null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>);

}