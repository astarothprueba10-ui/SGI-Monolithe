import React from 'react';
import { Breadcrumbs } from '../ui/Primitives';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  image: string;
  crumbs: {label: string;to?: string;}[];
  children?: React.ReactNode;
}

export function PageHero({ eyebrow, title, description, image, crumbs, children }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-night">
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-35" />
      
      <div className="absolute inset-0 bg-night/70" aria-hidden="true" />
      <div className="shell relative py-16 lg:py-24">
        <Breadcrumbs items={crumbs} light />
        {eyebrow &&
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-gold-400">
            {eyebrow}
          </p>
        }
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.1] text-white sm:text-5xl">
          {title}
        </h1>
        {description &&
        <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-white/75">{description}</p>
        }
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>);

}