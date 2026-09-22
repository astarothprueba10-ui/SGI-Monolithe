import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClockIcon,
  ImagesIcon,
  PencilLineIcon } from
'lucide-react';
import { Badge } from '../../components/ui/Primitives';
import { changeLog, mediaLibrary } from '../../data/cms';
import { projects } from '../../data/projects';

const metrics = [
{ label: 'Contenidos publicados', value: '18', icon: CheckCircle2Icon, tone: 'text-brand' },
{ label: 'Contenidos pendientes', value: '2', icon: ClockIcon, tone: 'text-gold-600' },
{ label: 'Imágenes utilizadas', value: String(mediaLibrary.length), icon: ImagesIcon, tone: 'text-night' },
{
  label: 'Proyectos publicados',
  value: String(projects.filter((p) => p.published).length),
  icon: Building2Icon,
  tone: 'text-night'
}];


const quickActions = [
{ label: 'Editar página de inicio', to: '/cms/contenido/inicio', desc: 'Hero, proyecto destacado e inversión' },
{ label: 'Administrar proyectos', to: '/cms/proyectos', desc: 'Crear, editar y publicar proyectos' },
{ label: 'Actualizar información', to: '/cms/contenido/institucional', desc: 'Nosotros, misión, visión y valores' }];


function stateTone(state: string) {
  if (state === 'Publicado') return 'green' as const;
  if (state === 'Borrador') return 'neutral' as const;
  return 'gold' as const;
}

export function CmsDashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="font-display text-3xl text-night">Panel de contenidos</h1>
        <p className="mt-2 text-sm text-muted">
          Resumen del estado de la web pública de MONOLITHE al 13 de septiembre de 2026.
        </p>
      </header>

      {/* Métricas */}
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) =>
        <div key={m.label} className="rounded-xl border border-line bg-white p-5">
            <m.icon className={`h-5 w-5 ${m.tone}`} strokeWidth={1.6} />
            <p className="mt-4 font-display text-3xl text-night">{m.value}</p>
            <p className="mt-1 text-[13px] text-muted">{m.label}</p>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Últimos cambios */}
        <section className="rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-[15px] font-semibold text-night">Últimos cambios</h2>
            <Link
              to="/cms/publicaciones"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-night hover:text-brand">
              
              Ver historial
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {changeLog.slice(0, 5).map((c) =>
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-night">{c.section}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {c.user} · {c.date}
                  </p>
                </div>
                <Badge tone={stateTone(c.state)}>{c.state}</Badge>
              </li>
            )}
          </ul>
        </section>

        {/* Acciones rápidas */}
        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold text-night">Acciones rápidas</h2>
          {quickActions.map((a) =>
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 transition-[border-color,box-shadow] duration-150 ease-out hover:border-night/30 hover:shadow-card">
            
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <PencilLineIcon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-night">{a.label}</span>
                <span className="block text-[12.5px] text-muted">{a.desc}</span>
              </span>
              <ArrowRightIcon className="h-4 w-4 text-muted" />
            </Link>
          )}
        </section>
      </div>

      {/* Imágenes utilizadas */}
      <section className="rounded-xl border border-line bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-night">Imágenes utilizadas recientemente</h2>
          <Link
            to="/cms/imagenes"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-night hover:text-brand">
            
            Biblioteca
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {mediaLibrary.slice(0, 6).map((m) =>
          <li key={m.id} className="overflow-hidden rounded-lg border border-line">
              <img src={m.src} alt={m.name} className="aspect-square w-full object-cover" />
            </li>
          )}
        </ul>
      </section>
    </div>);

}