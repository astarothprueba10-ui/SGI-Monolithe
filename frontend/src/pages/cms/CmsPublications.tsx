import React, { useState } from 'react';
import { CheckIcon, EyeIcon, FileEditIcon, RocketIcon, SaveIcon } from 'lucide-react';
import { Badge, Breadcrumbs, Modal, Tabs } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { changeLog } from '../../data/cms';
import type { ChangeLogEntry } from '../../types/content';

const flow = [
{ icon: FileEditIcon, title: 'Edición', text: 'Marketing modifica textos e imágenes de una sección.' },
{ icon: SaveIcon, title: 'Borrador', text: 'Los cambios quedan guardados sin afectar el sitio público.' },
{ icon: EyeIcon, title: 'Vista previa', text: 'Se revisa el resultado tal como lo verá el visitante.' },
{ icon: RocketIcon, title: 'Publicación', text: 'Se confirma y los cambios salen en vivo.' }];


function tone(state: ChangeLogEntry['state']) {
  if (state === 'Publicado') return 'green' as const;
  if (state === 'Borrador') return 'neutral' as const;
  return 'gold' as const;
}

export function CmsPublications() {
  const [filter, setFilter] = useState('todos');
  const [rows, setRows] = useState(changeLog);
  const [confirm, setConfirm] = useState<ChangeLogEntry | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');

  const tabs = [
  { id: 'todos', label: 'Todos', count: rows.length },
  { id: 'Borrador', label: 'Borradores', count: rows.filter((r) => r.state === 'Borrador').length },
  { id: 'En revisión', label: 'En revisión', count: rows.filter((r) => r.state === 'En revisión').length },
  { id: 'Publicado', label: 'Publicados', count: rows.filter((r) => r.state === 'Publicado').length }];


  const visible = filter === 'todos' ? rows : rows.filter((r) => r.state === filter);

  function publish() {
    if (!confirm) return;
    setPublishing(true);
    window.setTimeout(() => {
      setRows((prev) =>
      prev.map((r) =>
      r.id === confirm.id ?
      { ...r, state: 'Publicado', date: '13 sep 2026 · 10:12', user: 'Lucía Vásquez' } :
      r
      )
      );
      setPublishing(false);
      setNotice(`«${confirm.section}» se publicó correctamente.`);
      setConfirm(null);
    }, 1000);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Breadcrumbs items={[{ label: 'CMS', to: '/cms' }, { label: 'Publicaciones / cambios' }]} />

      <header>
        <h1 className="font-display text-3xl text-night">Publicaciones y cambios</h1>
        <p className="mt-2 text-sm text-muted">
          Controla el ciclo de vida de cada modificación antes de que llegue al sitio público.
        </p>
      </header>

      {notice &&
      <Alert tone="success" title="Publicado correctamente" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      }

      {/* Flujo */}
      <section className="rounded-xl border border-line bg-white p-6">
        <h2 className="text-[15px] font-semibold text-night">Flujo de publicación</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-4">
          {flow.map((step, i) =>
          <li key={step.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-night text-[12px] font-semibold text-gold">
                  {i + 1}
                </span>
                <step.icon className="h-5 w-5 text-brand" strokeWidth={1.6} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-night">{step.title}</h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{step.text}</p>
              {i < flow.length - 1 &&
            <span
              aria-hidden="true"
              className="absolute -right-3 top-4 hidden h-px w-6 bg-line md:block" />

            }
            </li>
          )}
        </ol>
      </section>

      {/* Registro */}
      <section className="rounded-xl border border-line bg-white">
        <div className="flex flex-col gap-4 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs tabs={tabs} active={filter} onChange={setFilter} />
          <p className="text-[13px] text-muted">Registro de los últimos 30 días</p>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3 font-semibold">Código</th>
                <th scope="col" className="px-5 py-3 font-semibold">Sección modificada</th>
                <th scope="col" className="px-5 py-3 font-semibold">Usuario</th>
                <th scope="col" className="px-5 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((row) =>
              <tr key={row.id} className="transition-colors duration-150 ease-out hover:bg-bone/60">
                  <td className="px-5 py-4 font-mono text-[12.5px] text-muted">{row.id}</td>
                  <td className="px-5 py-4 font-semibold text-night">{row.section}</td>
                  <td className="px-5 py-4 text-muted">{row.user}</td>
                  <td className="px-5 py-4 text-muted">{row.date}</td>
                  <td className="px-5 py-4">
                    <Badge tone={tone(row.state)}>{row.state}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {row.state === 'Publicado' ?
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-700">
                        <CheckIcon className="h-3.5 w-3.5" />
                        En vivo
                      </span> :

                  <Button size="sm" onClick={() => setConfirm(row)}>
                        Publicar
                      </Button>
                  }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Confirmar publicación"
        description="Esta acción hará visibles los cambios en el sitio público de MONOLITHE."
        footer={
        <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button loading={publishing} onClick={publish}>
              Publicar ahora
            </Button>
          </>
        }>
        
        {confirm &&
        <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Sección</dt>
              <dd className="font-semibold text-night">{confirm.section}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Editado por</dt>
              <dd className="font-medium text-night">{confirm.user}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Última edición</dt>
              <dd className="font-medium text-night">{confirm.date}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Publicará</dt>
              <dd className="font-medium text-night">Lucía Vásquez · Marketing</dd>
            </div>
          </dl>
        }
      </Modal>
    </div>);

}