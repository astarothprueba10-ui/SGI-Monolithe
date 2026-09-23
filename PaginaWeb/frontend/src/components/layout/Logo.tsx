import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface LogoProps {
  light?: boolean;
  to?: string;
  className?: string;
}

export function Logo({ light = false, to = '/', className }: LogoProps) {
  const content =
  <span className={cn('flex items-center gap-2.5', className)}>
      <span
      aria-hidden="true"
      className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-gold/70 bg-gold/10">
      
        <span className="block h-4 w-[3px] bg-gold" />
        <span className="ml-[3px] block h-5 w-[3px] bg-gold" />
        <span className="ml-[3px] block h-3 w-[3px] bg-gold" />
      </span>
      <span className="leading-none">
        <span
        className={cn(
          'block font-display text-[19px] font-semibold tracking-[0.14em]',
          light ? 'text-white' : 'text-night'
        )}>
        
          MONOLITHE
        </span>
        <span
        className={cn(
          'mt-1 block text-[9px] font-semibold uppercase tracking-[0.32em]',
          light ? 'text-gold-400' : 'text-gold-600'
        )}>
        
          Inmobiliaria
        </span>
      </span>
    </span>;


  return (
    <Link to={to} className="focus-ring rounded-md" aria-label="MONOLITHE — Inicio">
      {content}
    </Link>);

}