import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRightIcon,
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  MapIcon,
  MapPinIcon,
  MessageCircleIcon,
  NavigationIcon } from
'lucide-react';
import { Badge, Breadcrumbs, Modal, SectionHeading, Tabs, statusTone } from '../components/ui/Primitives';
import { AnchorButton, Button, LinkButton } from '../components/ui/Button';
import { EmptyState } from '../components/ui/Feedback';
import { LeadForm } from '../components/public/LeadForm';
import { Icon } from '../components/ui/Icon';
import { getProject } from '../data/projects';
import { benefitCategories, contactInfo } from '../data/site';

const docs = [
{ name: 'Plano general del condominio', meta: 'PDF · 2.4 MB' },
{ name: 'Cuadro de lotes y áreas', meta: 'PDF · 640 KB' },
{ name: 'Brochure comercial 2026', meta: 'PDF · 5.1 MB' }];


export function ProjectDetail() {
  const { slug } = useParams();
  const project = getProject(slug ?? '');
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);

  if (!project) {
    return (
      <div className="shell py-24">
        <EmptyState
          title="No encontramos este proyecto"
          description="Es posible que el enlace haya cambiado o que el proyecto ya no esté publicado."
          action={<LinkButton to="/proyectos">Ver todos los proyectos</LinkButton>} />
        
      </div>);

  }

  const galleryFilters: Record<string, (caption: string) => boolean> = {
    todos: () => true,
    render: (c) => /render|masterplan/i.test(c),
    terreno: (c) => /terreno|aérea|aerea|vista/i.test(c),
    comunes: (c) => /parque|parrilla|cancha|pórtico|portico|área|area/i.test(c)
  };

  const galleryTabs = [
  { id: 'todos', label: 'Todo', count: project.gallery.length },
  { id: 'render', label: 'Renders', count: project.gallery.filter((g) => galleryFilters.render(g.caption)).length },
  { id: 'terreno', label: 'Terreno', count: project.gallery.filter((g) => galleryFilters.terreno(g.caption)).length },
  { id: 'comunes', label: 'Áreas comunes', count: project.gallery.filter((g) => galleryFilters.comunes(g.caption)).length }];


  const visibleGallery = project.gallery.filter((g) => galleryFilters[tab](g.caption));
  const mainImage = visibleGallery[0] ?? project.gallery[0];
  const shown = project.gallery[activeImg] && galleryFilters[tab](project.gallery[activeImg].caption) ?
  project.gallery[activeImg] :
  mainImage;

  const allBenefits = benefitCategories.flatMap((c) =>
  c.items.map((i) => ({ ...i, category: c.title }))
  );

  return (
    <>
      {/* Hero del proyecto */}
      <section className="relative isolate overflow-hidden bg-night">
        <img
          src={project.cover}
          alt={`Vista general de ${project.name}`}
          className="absolute inset-0 h-full w-full object-cover opacity-40" />
        
        <div className="absolute inset-0 bg-night/65" aria-hidden="true" />
        <div className="shell relative py-14 lg:py-20">
          <Breadcrumbs
            light
            items={[
            { label: 'Inicio', to: '/' },
            { label: 'Proyectos', to: '/proyectos' },
            { label: project.name }]
            } />
          
          <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge tone={statusTone(project.status)}>{project.status}</Badge>
              <h1 className="mt-4 font-display text-4xl leading-[1.1] text-white sm:text-5xl">
                {project.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-[15px] text-white/75">
                <MapPinIcon className="h-4 w-4 text-gold" />
                {project.location}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={() => setModalOpen(true)}>
                  Solicitar información
                </Button>
                <AnchorButton
                  href={contactInfo.whatsappUrl}
                  target="_blank"
                  size="lg"
                  variant="secondary"
                  className="border-white/35 bg-transparent text-white hover:border-white hover:bg-white hover:text-night">
                  
                  <MessageCircleIcon className="h-4 w-4" />
                  Hablar con un asesor
                </AnchorButton>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-10 gap-y-5 rounded-2xl border border-white/15 bg-night/60 p-6 backdrop-blur sm:grid-cols-4 lg:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Área desde</dt>
                <dd className="mt-1 font-display text-2xl text-white">{project.areaFrom}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Precio desde</dt>
                <dd className="mt-1 font-display text-2xl text-gold-400">{project.priceFrom}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Inicial</dt>
                <dd className="mt-1 text-[15px] font-semibold text-white">
                  {project.financing.downPayment}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-white/50">Cuotas</dt>
                <dd className="mt-1 text-[15px] font-semibold text-white">{project.financing.months}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Galería */}
      <section className="bg-white py-16 lg:py-20">
        <div className="shell">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading eyebrow="Galería" title="Así se ve el proyecto" />
            <Tabs tabs={galleryTabs} active={tab} onChange={setTab} />
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[2.2fr_1fr]">
            <figure className="overflow-hidden rounded-2xl bg-bone">
              <img
                src={shown.src}
                alt={shown.caption}
                className="aspect-[16/10] w-full object-cover" />
              
              <figcaption className="px-5 py-3 text-sm text-muted">{shown.caption}</figcaption>
            </figure>
            <ul className="grid grid-cols-3 gap-3 lg:grid-cols-2">
              {visibleGallery.map((g) =>
              <li key={g.src + g.caption}>
                  <button
                  type="button"
                  onClick={() => setActiveImg(project.gallery.indexOf(g))}
                  aria-label={`Ver ${g.caption}`}
                  aria-current={g.src === shown.src}
                  className={
                  'block w-full overflow-hidden rounded-xl border-2 transition-colors duration-150 ease-out ' + (
                  g.src === shown.src ? 'border-gold' : 'border-transparent hover:border-line')
                  }>
                  
                    <img src={g.src} alt={g.caption} className="aspect-[4/3] w-full object-cover" />
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Información + tarjeta comercial */}
      <section className="bg-bone py-16 lg:py-24" id="financiamiento">
        <div className="shell grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div>
            <SectionHeading eyebrow="Información principal" title="Sobre el proyecto" />
            <p className="mt-6 text-[15px] leading-relaxed text-muted">{project.description}</p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {project.highlights.map((h) =>
              <li key={h} className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3">
                  <CheckIcon className="h-4 w-4 shrink-0 text-brand" />
                  <span className="text-sm font-medium text-night">{h}</span>
                </li>
              )}
            </ul>
          </div>

          <aside className="sticky top-28 rounded-2xl border border-line bg-white p-7 shadow-lift">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              Precio y financiamiento
            </p>
            <p className="mt-3 font-display text-4xl text-night">{project.financing.cash}</p>
            <p className="mt-1 text-sm text-muted">Preventa al contado</p>

            <dl className="mt-7 space-y-4 border-t border-line pt-6 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Inicial desde</dt>
                <dd className="font-semibold text-night">{project.financing.downPayment}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Saldo financiable</dt>
                <dd className="font-semibold text-night">Directo con MONOLITHE</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Plazo</dt>
                <dd className="font-semibold text-brand">{project.financing.months}</dd>
              </div>
            </dl>

            <p className="mt-5 rounded-lg bg-bone px-4 py-3 text-[13px] leading-relaxed text-muted">
              {project.financing.note}
            </p>

            <Button className="mt-6 w-full" size="lg" onClick={() => setModalOpen(true)}>
              Solicitar información
            </Button>
            <AnchorButton
              href={contactInfo.whatsappUrl}
              target="_blank"
              variant="secondary"
              className="mt-3 w-full">
              
              <MessageCircleIcon className="h-4 w-4 text-brand" />
              Hablar con un asesor
            </AnchorButton>
          </aside>
        </div>
      </section>

      {/* Beneficios y servicios */}
      <section className="bg-white py-16 lg:py-24">
        <div className="shell">
          <SectionHeading
            eyebrow="Beneficios y servicios"
            title="Todo lo que incluye tu lote"
            description="Cada servicio y área común forma parte del expediente técnico aprobado del condominio." />
          
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {allBenefits.map((b) =>
            <li key={b.name} className="flex h-full gap-4 rounded-xl border border-line p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-600">
                  <Icon name={b.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted">{b.category}</p>
                  <h3 className="mt-0.5 text-[15px] font-semibold text-night">{b.name}</h3>
                </div>
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Ubicación + documentos */}
      <section className="bg-bone py-16 lg:py-24">
        <div className="shell grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <SectionHeading eyebrow="Ubicación" title="Cómo llegar a Los Cocos" />
            <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex h-72 flex-col items-center justify-center bg-night/[0.04] text-center">
                <MapIcon className="h-9 w-9 text-gold" strokeWidth={1.4} />
                <p className="mt-3 text-sm font-semibold text-night">Mapa interactivo</p>
                <p className="mt-1 max-w-xs text-[13px] text-muted">
                  Espacio reservado para la integración del mapa con la ubicación exacta del
                  proyecto.
                </p>
              </div>
              <div className="flex flex-col gap-4 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-night">{project.location}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Acceso por vía asfaltada · 30 minutos desde el centro de Chiclayo
                  </p>
                </div>
                <AnchorButton href="#" variant="secondary" size="sm">
                  <NavigationIcon className="h-4 w-4" />
                  Cómo llegar
                </AnchorButton>
              </div>
            </div>
          </div>

          <div>
            <SectionHeading eyebrow="Planos e información" title="Documentos del proyecto" />
            <ul className="mt-8 space-y-3">
              {docs.map((d) =>
              <li key={d.name}>
                  <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="flex w-full items-center gap-4 rounded-xl border border-line bg-white p-4 text-left transition-colors duration-150 ease-out hover:border-night/30">
                  
                    <FileTextIcon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.6} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-night">{d.name}</span>
                      <span className="block text-xs text-muted">{d.meta}</span>
                    </span>
                    <DownloadIcon className="h-4 w-4 text-muted" />
                  </button>
                </li>
              )}
            </ul>
            <Link
              to="/beneficios"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-night hover:text-brand">
              
              Ver todos los beneficios del condominio
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="bg-white py-16 lg:py-24">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <SectionHeading
            eyebrow="Contacto"
            title="Solicita el cuadro de lotes disponibles"
            description="Te enviamos precios actualizados, disponibilidad y el cronograma de pagos según la inicial que puedas dar." />
          
          <LeadForm />
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Solicitar información"
        description={`Déjanos tus datos y un asesor te contactará sobre ${project.name}.`}>
        
        <LeadForm compact />
      </Modal>
    </>);

}