import React from 'react';
import { cn } from '../../utils/cn';

export function Table({
  head,
  children,
  className




}: {head: React.ReactNode;children: React.ReactNode;className?: string;}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="bg-brand-50/60">
          <tr className="border-b border-brand-100">{head}</tr>
        </thead>
        <tbody className="divide-y divide-brand-50">{children}</tbody>
      </table>
    </div>);

}

export function TH({
  children,
  align = 'left',
  className




}: {children?: React.ReactNode;align?: 'left' | 'right' | 'center';className?: string;}) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-brand-400',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}>
      
      {children}
    </th>);

}

export function TR({
  children,
  onClick,
  selected,
  className





}: {children: React.ReactNode;onClick?: () => void;selected?: boolean;className?: string;}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-150 ease-smooth',
        onClick && 'cursor-pointer hover:bg-brand-50/70',
        selected && 'bg-brand-50',
        className
      )}>
      
      {children}
    </tr>);

}

export function TD({
  children,
  align = 'left',
  className




}: {children?: React.ReactNode;align?: 'left' | 'right' | 'center';className?: string;}) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-brand-700',
        align === 'right' && 'text-right tabular',
        align === 'center' && 'text-center',
        className
      )}>
      
      {children}
    </td>);

}