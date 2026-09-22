import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, PencilIcon, PlusIcon, SearchIcon, UploadIcon, XCircleIcon } from 'lucide-react';
import { Badge, Breadcrumbs, Modal, statusTone } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { projects as seed } from '../../data/projects';
import type { Project } from '../../types/content';

export function CmsProjects() {
  const [rows, setRows] = useState<Project[]>(seed);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const visible = rows.filter(
    (r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.location.toLowerCase().includes(query.toLowerCase())
  );

  function togglePublish(slug: string) {
    setRows((prev) =>
    prev.map((r) => r.slug === slug ? { ...r, published: !r.published } : r)
    );
    const p = rows.find((r) => r.slug === slug);
    setNotice(
      p?.published ? `«${p.name}» se despublicó del sitio.` : `«${p?.name}» se publicó correctamente.`
    );
  }

  function save() {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setFormOpen(false);
      setNotice(
        editing ? `Los cambios de «${editing.name}» se guardaron.` : 'Nuevo proyecto creado como borrador.'
      );
    }, 1000);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumbs items={[{ label: 'CMS', to: '/cms' }, { label: 'Proyectos' }]} />

      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-night">Administración de proyectos</h1>
          <p className="mt-2 text-sm text-muted">
            Gestiona la información comercial que se muestra en el sitio público.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}>
          
          <PlusIcon className="h-4 w-4" />
          Crear proyecto
        </Button>
      </header>

      {notice &&
      <Alert tone="success" title="Acción completada" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      }

      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ubicación"
              className="pl-9"
              aria-label="Buscar proyectos" />
            
          </div>
          <p className="text-[13px] text-muted">{visible.length} proyectos</p>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">Proyecto</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-5 py-3 font-semibold">Precio desde</th>
                <th scope="col" className="px-5 py-3 font-semibold">Publicación</th>
                <th scope="col" className="px-5 py-3 font-semibold">Actualizado</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((p) =>
              <tr key={p.slug} className="transition-colors duration-150 ease-out hover:bg-bone/60">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img src={p.cover} alt="" className="h-11 w-16 rounded-md object-cover" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-night">{p.name}</p>
                        <p className="truncate text-[12.5px] text-muted">{p.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  </td>
                  <td className="px-5 py-4 font-semibold text-night">{p.priceFrom}</td>
                  <td className="px-5 py-4">
                    <span
                    className={
                    'inline-flex items-center gap-2 text-[13px] font-medium ' + (
                    p.published ? 'text-brand-700' : 'text-muted')
                    }>
                    
                      <span
                      className={
                      'h-2 w-2 rounded-full ' + (p.published ? 'bg-brand' : 'bg-line')
                      } />
                    
                      {p.published ? 'Publicado' : 'Despublicado'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-muted">{p.updatedAt}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Link
                      to={`/proyectos/${p.slug}`}
                      target="_blank"
                      aria-label={`Ver ${p.name}`}
                      className="rounded-lg p-2 text-muted transition-colors duration-150 ease-out hover:bg-bone hover:text-night">
                      
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <button
                      type="button"
                      aria-label={`Editar ${p.name}`}
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="rounded-lg p-2 text-muted transition-colors duration-150 ease-out hover:bg-bone hover:text-night">
                      
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                      type="button"
                      aria-label={p.published ? `Despublicar ${p.name}` : `Publicar ${p.name}`}
                      onClick={() => togglePublish(p.slug)}
                      className="rounded-lg p-2 text-muted transition-colors duration-150 ease-out hover:bg-bone hover:text-night">
                      
                        {p.published ?
                      <XCircleIcon className="h-4 w-4" /> :

                      <UploadIcon className="h-4 w-4" />
                      }
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        size="lg"
        title={editing ? `Editar ${editing.name}` : 'Nuevo proyecto'}
        description="Los campos marcados se publican directamente en la ficha del proyecto."
        footer={
        <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={save}>
              Guardar borrador
            </Button>
            <Button loading={saving} onClick={save}>
              Guardar y publicar
            </Button>
          </>
        }>
        
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="p-nombre" required>
              <Input id="p-nombre" defaultValue={editing?.name ?? ''} />
            </Field>
            <Field label="Ubicación" htmlFor="p-ubicacion" required>
              <Input id="p-ubicacion" defaultValue={editing?.location ?? ''} />
            </Field>
            <Field label="Precio desde" htmlFor="p-precio" required>
              <Input id="p-precio" defaultValue={editing?.priceFrom ?? ''} placeholder="S/ 25,900" />
            </Field>
            <Field label="Área desde" htmlFor="p-area" required>
              <Input id="p-area" defaultValue={editing?.areaFrom ?? ''} placeholder="450 m²" />
            </Field>
            <Field label="Estado" htmlFor="p-estado" required>
              <Select id="p-estado" defaultValue={editing?.status ?? 'Preventa'}>
                <option>Preventa</option>
                <option>En venta</option>
                <option>Próximamente</option>
              </Select>
            </Field>
            <Field label="Tipo de proyecto" htmlFor="p-tipo" required>
              <Select id="p-tipo" defaultValue={editing?.type ?? 'Lotes campestres'}>
                <option>Lotes campestres</option>
                <option>Lotes urbanos</option>
                <option>Condominio</option>
              </Select>
            </Field>
          </div>

          <Field label="Descripción" htmlFor="p-desc" required>
            <Textarea id="p-desc" defaultValue={editing?.description ?? ''} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-night">Imagen principal</p>
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-line bg-bone/60 text-center">
                {editing ?
                <img src={editing.cover} alt="" className="h-full w-full rounded-xl object-cover" /> :

                <p className="px-4 text-[12.5px] text-muted">
                    Arrastra una imagen o selecciónala de la biblioteca
                  </p>
                }
              </div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-night">Galería</p>
              <div className="grid h-32 grid-cols-3 gap-2">
                {(editing?.gallery ?? []).slice(0, 3).map((g) =>
                <img key={g.src} src={g.src} alt="" className="h-full w-full rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  className="flex h-full items-center justify-center rounded-lg border border-dashed border-line text-muted transition-colors duration-150 ease-out hover:border-night/30 hover:text-night">
                  
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Inicial desde" htmlFor="p-inicial" required>
              <Input id="p-inicial" defaultValue={editing?.financing.downPayment ?? ''} />
            </Field>
            <Field label="Plazo de financiamiento" htmlFor="p-plazo" required>
              <Input id="p-plazo" defaultValue={editing?.financing.months ?? ''} />
            </Field>
            <Field label="Nota comercial" htmlFor="p-nota">
              <Input id="p-nota" defaultValue={editing?.financing.note ?? ''} />
            </Field>
          </div>

          <Field label="Beneficios incluidos" htmlFor="p-beneficios" hint="Separa cada beneficio con una coma.">
            <Textarea
              id="p-beneficios"
              defaultValue={(editing?.highlights ?? []).join(', ')}
              className="min-h-[90px]" />
            
          </Field>
        </div>
      </Modal>
    </div>);

}