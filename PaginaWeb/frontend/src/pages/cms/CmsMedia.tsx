import React, { useState } from 'react';
import { ImageOffIcon, RefreshCwIcon, SearchIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react';
import { Breadcrumbs, Modal } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Form';
import { Alert, EmptyState } from '../../components/ui/Feedback';
import { mediaLibrary } from '../../data/cms';
import { cn } from '../../utils/cn';

export function CmsMedia() {
  const [items, setItems] = useState(mediaLibrary);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const visible = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));
  const current = items.find((i) => i.id === selected);

  function remove() {
    const item = items.find((i) => i.id === toDelete);
    setItems((prev) => prev.filter((i) => i.id !== toDelete));
    setToDelete(null);
    setSelected(null);
    setNotice(`Se eliminó «${item?.name}» de la biblioteca.`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumbs items={[{ label: 'CMS', to: '/cms' }, { label: 'Imágenes' }]} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-night">Biblioteca de imágenes</h1>
          <p className="mt-2 text-sm text-muted">
            Administra las fotografías y renders utilizados en la web pública.
          </p>
        </div>
        <Button>
          <UploadCloudIcon className="h-4 w-4" />
          Subir imágenes
        </Button>
      </header>

      {notice &&
      <Alert tone="success" title="Biblioteca actualizada" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      }

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar imagen por nombre"
                className="pl-9"
                aria-label="Buscar imágenes" />
              
            </div>
            <p className="text-[13px] text-muted">{visible.length} archivos</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-8 text-center">
            <UploadCloudIcon className="h-7 w-7 text-gold" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-semibold text-night">
              Arrastra tus imágenes aquí o haz clic para subirlas
            </p>
            <p className="mt-1 text-[12.5px] text-muted">JPG o PNG · máximo 3 MB por archivo</p>
          </div>

          {visible.length === 0 ?
          <EmptyState
            icon={<ImageOffIcon className="h-10 w-10" />}
            title="Sin resultados"
            description="No encontramos imágenes con ese nombre. Prueba con otro término de búsqueda."
            action={<Button variant="secondary" onClick={() => setQuery('')}>Limpiar búsqueda</Button>} /> :


          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((m) =>
            <li key={m.id}>
                  <button
                type="button"
                onClick={() => setSelected(m.id)}
                aria-pressed={selected === m.id}
                className={cn(
                  'block w-full overflow-hidden rounded-xl border-2 bg-white text-left transition-colors duration-150 ease-out',
                  selected === m.id ? 'border-gold' : 'border-line hover:border-night/30'
                )}>
                
                    <img src={m.src} alt={m.name} className="aspect-[4/3] w-full object-cover" />
                    <span className="block truncate px-3 pt-2 text-[12.5px] font-medium text-night">
                      {m.name}
                    </span>
                    <span className="block px-3 pb-3 text-[11.5px] text-muted">{m.size}</span>
                  </button>
                </li>
            )}
            </ul>
          }
        </div>

        {/* Detalle */}
        <aside className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            Detalle del archivo
          </h2>
          {current ?
          <div className="mt-4 space-y-4">
              <img src={current.src} alt={current.name} className="w-full rounded-lg object-cover" />
              <div>
                <p className="break-all text-sm font-semibold text-night">{current.name}</p>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Peso</dt>
                    <dd className="font-medium text-night">{current.size}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Usada en</dt>
                    <dd className="text-right font-medium text-night">{current.usedIn}</dd>
                  </div>
                </dl>
              </div>
              <div className="space-y-2">
                <Button variant="secondary" size="sm" className="w-full">
                  <RefreshCwIcon className="h-4 w-4" />
                  Reemplazar imagen
                </Button>
                <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => setToDelete(current.id)}>
                
                  <Trash2Icon className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div> :

          <p className="mt-4 text-[13px] leading-relaxed text-muted">
              Selecciona una imagen de la grilla para ver su información, reemplazarla o eliminarla.
            </p>
          }
        </aside>
      </div>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="¿Eliminar esta imagen?"
        description="La imagen dejará de estar disponible para todas las secciones de la web."
        footer={
        <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove}>
              Eliminar definitivamente
            </Button>
          </>
        } />
      
    </div>);

}