import React, { useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { IMAGES } from '../../data/projects';
import { cn } from '../../utils/cn';

const slides = [
{
  image: IMAGES.heroAerial,
  eyebrow: 'Preventa · Picsi, Chiclayo',
  title: 'Invierte hoy en el lugar donde construirás tu futuro',
  text: 'Terrenos pensados para vivir, invertir y crecer.'
},
{
  image: IMAGES.heroAvenue,
  eyebrow: 'Condominio Campestre Los Cocos',
  title: 'Lotes campestres desde 450 m² a 30 minutos de Chiclayo',
  text: 'Áreas verdes, servicios y seguridad dentro de un condominio cerrado.'
},
{
  image: IMAGES.heroHouse,
  eyebrow: 'Financiamiento directo',
  title: 'Tu lote propio con una inicial desde S/ 8,000',
  text: 'Saldo financiado hasta en 36 meses, sin bancos de por medio.'
}];


export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => window.clearInterval(id);
  }, []);

  const go = (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length);
  const slide = slides[index];

  return (
    <section className="relative isolate min-h-[560px] overflow-hidden bg-night lg:min-h-[680px]">
      {slides.map((s, i) =>
      <img
        key={s.image}
        src={s.image}
        alt={i === index ? s.title : ''}
        aria-hidden={i !== index}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out',
          i === index ? 'opacity-100' : 'opacity-0'
        )} />

      )}
      <div
        className="absolute inset-0 bg-night/70"
        aria-hidden="true" />
      

      <div className="shell relative flex min-h-[560px] flex-col justify-center py-20 lg:min-h-[680px]">
        <div key={index} className="max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-night/40 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-400">
            {slide.eyebrow}
          </p>
          <h1 className="mt-6 font-display text-[38px] leading-[1.08] text-white sm:text-5xl lg:text-[58px]">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/80">{slide.text}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/proyectos" size="lg">
              Conoce nuestros proyectos
            </LinkButton>
            <LinkButton
              to="/contacto"
              size="lg"
              variant="secondary"
              className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white hover:text-night">
              
              Solicitar información
            </LinkButton>
          </div>
        </div>

        <div className="mt-14 flex items-center gap-5">
          <div className="flex gap-2" role="tablist" aria-label="Diapositivas del hero">
            {slides.map((s, i) =>
            <button
              key={s.image}
              role="tab"
              aria-selected={i === index}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out',
                i === index ? 'w-10 bg-gold' : 'w-5 bg-white/35 hover:bg-white/60'
              )} />

            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Diapositiva anterior"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-150 ease-out hover:border-gold hover:text-gold">
              
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Siguiente diapositiva"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors duration-150 ease-out hover:border-gold hover:text-gold">
              
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>);

}