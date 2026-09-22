import React, { useEffect, useState } from 'react';
import {
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  FolderOpenIcon } from
'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { documentos } from '../../data/portal';
import { documentoEstadoLabel, documentoEstadoTone } from '../../utils/estados';
import { formatDate } from '../../utils/format';

const tipos = ['Todos', 'Contrato', 'Financiamiento', 'Plano', 'Estado de cuenta', 'Adenda'];

export function Documentos() {
  const [cargando, setCargando] = useState(true);
  const [tipo, setTipo] = useState('Todos');

  useEffect(() => {
    const id = setTimeout(() => setCargando(false), 700);
    return () => clearTimeout(id);
  }, []);

  const visibles = documentos.filter(
    (d) => tipo === 'Todos' || d.tipo === tipo
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentos"
        title="Documentación de tu operación"
        description="Contratos, cronogramas, planos y estados de cuenta asociados únicamente a tu compra." />
      

      <Card as="section">
        <CardHeader
          title="Mis documentos"
          description={
          cargando ?
          'Cargando tu expediente…' :
          `${visibles.length} documento${visibles.length === 1 ? '' : 's'} disponible${visibles.length === 1 ? '' : 's'}`
          }
          icon={<FolderOpenIcon className="h-[18px] w-[18px]" />} />
        

        <div className="flex flex-wrap gap-1.5 border-b border-slateux-200 px-5 py-4">
          {tipos.map((t) => {
            const activo = tipo === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                aria-pressed={activo}
                className={[
                'h-8 rounded-full border px-3 text-[12.5px] font-medium outline-none',
                'transition-[background-color,border-color,color] duration-150 ease-out',
                'focus-visible:ring-2 focus-visible:ring-ink-700/25',
                activo ?
                'border-ink-800 bg-ink-800 text-white' :
                'border-slateux-200 bg-white text-slateux-600 hover:border-slateux-300 hover:text-ink-700'].
                join(' ')}>
                
                {t}
              </button>);

          })}
        </div>

        {cargando ?
        <ul className="divide-y divide-slateux-200" aria-hidden="true">
            {[0, 1, 2, 3].map((i) =>
          <li key={i} className="flex items-center gap-4 px-5 py-4">
                <span className="h-9 w-9 shrink-0 animate-pulse rounded-field bg-slateux-200" />
                <span className="flex-1">
                  <span className="block h-3.5 w-1/2 animate-pulse rounded bg-slateux-200" />
                  <span className="mt-2 block h-3 w-1/3 animate-pulse rounded bg-slateux-100" />
                </span>
                <span className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-slateux-100" />
              </li>
          )}
          </ul> :
        visibles.length === 0 ?
        <EmptyState
          icon={<FileTextIcon className="h-5 w-5" />}
          title="No hay documentos de este tipo"
          description="Cuando MONOLITHE emita un documento de esta categoría para tu operación, aparecerá aquí."
          action={
          <Button variant="secondary" onClick={() => setTipo('Todos')}>
                Ver todos
              </Button>
          } /> :


        <ul className="divide-y divide-slateux-200">
            {visibles.map((d) =>
          <li
            key={d.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field border border-slateux-200 bg-slateux-50 text-slateux-500">
                  <FileTextIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink-800">
                    {d.nombre}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-slateux-500">
                    {d.tipo} · {formatDate(d.fecha)} · {d.peso}
                  </p>
                </div>
                <StatusBadge tone={documentoEstadoTone[d.estado]}>
                  {documentoEstadoLabel[d.estado]}
                </StatusBadge>
                <div className="flex shrink-0 gap-1 sm:ml-2">
                  <Button
                variant="ghost"
                size="sm"
                icon={<EyeIcon className="h-4 w-4" />}>
                
                    Visualizar
                  </Button>
                  <Button
                variant="secondary"
                size="sm"
                icon={<DownloadIcon className="h-4 w-4" />}>
                
                    Descargar
                  </Button>
                </div>
              </li>
          )}
          </ul>
        }
      </Card>
    </div>);

}