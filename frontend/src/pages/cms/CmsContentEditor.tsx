import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImageIcon,
  SaveIcon,
  UploadCloudIcon } from
'lucide-react';
import { Badge, Breadcrumbs, Modal } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { Field, Input, Textarea } from '../../components/ui/Form';
import { Alert, EmptyState } from '../../components/ui/Feedback';
import { contentSections, mediaLibrary, type EditableSection } from '../../data/cms';

type Saved = 'none' | 'draft' | 'published';

export function CmsContentEditor() {
  const { section = 'inicio' } = useParams();
  const config = contentSections[section];

  const initial = useMemo(() => config?.sections ?? [], [config]);
  const [items, setItems] = useState<EditableSection[]>(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id ?? '');
  const [saved, setSaved] = useState<Saved>('none');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setItems(initial);
    setActiveId(initial[0]?.id ?? '');
    setSaved('none');
  }, [initial]);

  if (!config) {
    return (
      <EmptyState
        title="Sección no encontrada"
        description="El contenido solicitado no existe o fue archivado."
        action={<Link to="/cms" className="font-semibold text-brand">Volver al dashboard</Link>} />);


  }

  const current = items.find((i) => i.id === activeId) ?? items[0];

  function patch(changes: Partial<EditableSection>) {
    setItems((prev) => prev.map((i) => i.id === current.id ? { ...i, ...changes } : i));
    setSaved('none');
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    setItems(next);
    setSaved('none');
  }

  function publish() {
    setPublishing(true);
    window.setTimeout(() => {
      setPublishing(false);
      setConfirmOpen(false);
      setSaved('published');
    }, 1000);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumbs
        items={[{ label: 'CMS', to: '/cms' }, { label: 'Contenido' }, { label: config.label }]} />
      

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-night">{config.label}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            Ruta pública:
            <Link to={config.route} target="_blank" className="inline-flex items-center gap-1 font-semibold text-night hover:text-brand">
              {config.route}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="md" onClick={() => setSaved('draft')}>
            <SaveIcon className="h-4 w-4" />
            Guardar borrador
          </Button>
          <Button variant="secondary" size="md">
            <EyeIcon className="h-4 w-4" />
            Vista previa
          </Button>
          <Button size="md" onClick={() => setConfirmOpen(true)}>
            Publicar cambios
          </Button>
        </div>
      </header>

      {saved === 'draft' &&
      <Alert tone="info" title="Borrador guardado" onClose={() => setSaved('none')}>
          Los cambios quedaron guardados como borrador. Aún no son visibles en el sitio público.
        </Alert>
      }
      {saved === 'published' &&
      <Alert tone="success" title="Publicado correctamente" onClose={() => setSaved('none')}>
          Los cambios de «{config.label}» ya están visibles en el sitio público.
        </Alert>
      }

      <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
        {/* Lista de secciones */}
        <aside className="rounded-xl border border-line bg-white">
          <p className="border-b border-line px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-muted">
            Secciones de la página
          </p>
          <ul className="divide-y divide-line">
            {items.map((item, index) =>
            <li key={item.id} className="flex items-center gap-2 p-2">
                <button
                type="button"
                onClick={() => setActiveId(item.id)}
                className={
                'min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ease-out ' + (
                item.id === current.id ? 'bg-bone' : 'hover:bg-bone/60')
                }>
                
                  <span className="block truncate text-[13.5px] font-semibold text-night">
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-muted">
                    {item.active ? 'Visible' : 'Oculta'}
                  </span>
                </button>
                <div className="flex flex-col">
                  <button
                  type="button"
                  onClick={() => move(index, -1)}
                  aria-label={`Subir ${item.name}`}
                  disabled={index === 0}
                  className="rounded p-1 text-muted transition-colors duration-150 ease-out hover:text-night disabled:opacity-30">
                  
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                  type="button"
                  onClick={() => move(index, 1)}
                  aria-label={`Bajar ${item.name}`}
                  disabled={index === items.length - 1}
                  className="rounded p-1 text-muted transition-colors duration-150 ease-out hover:text-night disabled:opacity-30">
                  
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )}
          </ul>
        </aside>

        {/* Editor */}
        <section className="rounded-xl border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 className="text-[15px] font-semibold text-night">{current.name}</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">{current.description}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-3 text-[13px] font-medium text-night">
              {current.active ? <Badge tone="green">Activa</Badge> : <Badge>Oculta</Badge>}
              <span className="relative inline-flex">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={current.active}
                  onChange={(e) => patch({ active: e.target.checked })} />
                
                <span className="h-6 w-11 rounded-full bg-line transition-colors duration-150 ease-out peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-gold" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-150 ease-out peer-checked:translate-x-5" />
              </span>
              <span className="sr-only">Activar sección</span>
            </label>
          </div>

          <div className="space-y-5 p-6">
            <Field label="Título" htmlFor="titulo" required>
              <Input id="titulo" value={current.title} onChange={(e) => patch({ title: e.target.value })} />
            </Field>
            <Field label="Subtítulo" htmlFor="subtitulo" required>
              <Input
                id="subtitulo"
                value={current.subtitle}
                onChange={(e) => patch({ subtitle: e.target.value })} />
              
            </Field>
            <Field label="Descripción" htmlFor="descripcion" required>
              <Textarea
                id="descripcion"
                value={current.description}
                onChange={(e) => patch({ description: e.target.value })} />
              
            </Field>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-night">Imagen de la sección</p>
              <div className="flex flex-col gap-4 rounded-xl border border-line p-4 sm:flex-row sm:items-center">
                <img
                  src={current.image}
                  alt={`Imagen actual de ${current.name}`}
                  className="h-28 w-full rounded-lg object-cover sm:w-44" />
                
                <div className="flex-1">
                  <p className="text-sm font-medium text-night">Imagen actual</p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Recomendado 1920×1080 px · máximo 3 MB
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setMediaOpen(true)}>
                      <ImageIcon className="h-4 w-4" />
                      Cambiar imagen
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMediaOpen(true)}>
                      <UploadCloudIcon className="h-4 w-4" />
                      Subir nueva
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        size="lg"
        title="Seleccionar imagen"
        description="Elige una imagen de la biblioteca multimedia de MONOLITHE."
        footer={
        <Button variant="secondary" onClick={() => setMediaOpen(false)}>
            Cancelar
          </Button>
        }>
        
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {mediaLibrary.map((m) =>
          <li key={m.id}>
              <button
              type="button"
              onClick={() => {
                patch({ image: m.src });
                setMediaOpen(false);
              }}
              className="w-full overflow-hidden rounded-lg border-2 border-transparent text-left transition-colors duration-150 ease-out hover:border-gold">
              
                <img src={m.src} alt={m.name} className="aspect-[4/3] w-full object-cover" />
                <span className="block truncate px-2 py-2 text-[12px] text-muted">{m.name}</span>
              </button>
            </li>
          )}
        </ul>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="¿Publicar los cambios?"
        description={`Los cambios de «${config.label}» serán visibles de inmediato en el sitio público.`}
        footer={
        <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button loading={publishing} onClick={publish}>
              Sí, publicar
            </Button>
          </>
        }>
        
        <ul className="space-y-2 text-sm text-muted">
          <li>· Secciones modificadas: {items.length}</li>
          <li>· Usuario: Lucía Vásquez (Marketing)</li>
          <li>· Fecha: 13 de septiembre de 2026</li>
        </ul>
      </Modal>
    </div>);

}