import React from 'react';

type LogoProps = {
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md';
};

export function Logo({ tone = 'dark', size = 'md' }: LogoProps) {
  const isLight = tone === 'light';
  const markSize = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const titleSize = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className="flex items-center gap-3">
      <div
        className={[
        markSize,
        'flex shrink-0 items-center justify-center rounded-[10px] border',
        isLight ?
        'border-white/25 bg-white/10' :
        'border-ink-800 bg-ink-800'].
        join(' ')}
        aria-hidden="true">
        
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}>
          
          <path
            d="M3 20V9.2L12 3l9 6.2V20"
            stroke={isLight ? '#FFFFFF' : '#FFFFFF'}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round" />
          
          <path
            d="M9.5 20v-6.4h5V20"
            stroke="#C9A24B"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round" />
          
        </svg>
      </div>
      <div className="leading-tight">
        <p
          className={[
          titleSize,
          'font-semibold tracking-tight',
          isLight ? 'text-white' : 'text-ink-800'].
          join(' ')}>
          
          SIGI <span className="font-normal">MONOLITHE</span>
        </p>
        <p
          className={[
          'text-[11px] font-medium uppercase tracking-[0.14em]',
          isLight ? 'text-white/55' : 'text-slateux-400'].
          join(' ')}>
          
          Gestión Inmobiliaria
        </p>
      </div>
    </div>);

}