import React from 'react';
import { cn } from '../../utils/cn';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-brand-100 bg-white shadow-card',
        className
      )}
      {...props}>
      
      {children}
    </div>);

}

export function CardHeader({
  title,
  description,
  actions,
  className





}: {title: React.ReactNode;description?: React.ReactNode;actions?: React.ReactNode;className?: string;}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-brand-100 px-5 py-4',
        className
      )}>
      
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-brand-900">{title}</h3>
        {description ?
        <p className="mt-0.5 text-[13px] text-brand-400">{description}</p> :
        null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>);

}

export function CardBody({
  className,
  children



}: {className?: string;children: React.ReactNode;}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}