import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  DownloadIcon,
  FileTextIcon,
  LayersIcon,
  MapPinIcon,
  RulerIcon,
  UserIcon } from
'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { LOTS, PROJECTS } from '../data/projects';
import { area as fmtArea, currency, number } from '../utils/format';
import { cn } from '../utils/cn';
import type { Lot, LotStatus } from '../types';

const STATUSES: LotStatus[] = ['Disponible', 'Separado', 'Vendido'];

const LOT_STYLES: Record<LotStatus, string> = {
  Disponible: 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
  Separado: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
  Vendido: 'bg-brand-100 border-brand-300 text-brand-700 hover:bg-brand-200'
};

export function LotMap() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<LotStatus[]>(STATUSES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);

  const project = PROJECTS.find((p) => p.id === projectId)!;
  const projectLots = useMemo(() => LOTS.filter((l) => l.projectId === projectId), [projectId]);

  const counts = useMemo(
    () =>
    STATUSES.reduce<Record<LotStatus, number>>(
      (acc, s) => {
        acc[s] = projectLots.filter((l) => l.status === s).length;
        return acc;
      },
      { Disponible: 0, Separado: 0, Vendido: 0 }
    ),
    [projectLots]
  );

  const matches = (lot: Lot) => {
    const q = query.trim().toLowerCase();
    const byQuery =
    q.length === 0 ||
    lot.code.toLowerCase().includes(q) ||
    lot.block.toLowerCase().includes(q) ||
    (lot.client ?? '').toLowerCase().includes(q);
    return byQuery && active.includes(lot.status);
  };

  const blocks = useMemo(() => {
    const map = new Map<string, Lot[]>();
    projectLots.forEach((lot) => {
      const list = map.get(lot.block) ?? [];
      list.push(lot);
      map.set(lot.block, list);
    });
    return Array.from(map.entries());
  }, [projectLots]);

  const visibleCount = projectLots.filter(matches).length;
  const selected = projectLots.find((l) => l.id === selectedId) ?? null;

  const toggleStatus = (status: LotStatus) =>
  setActive((prev) =>
  prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
  );

  return (
    <div>
      <PageHeader
        title="Plano interactivo"
        description="Consulta la disponibilidad del inventario por etapa y manzana. Selecciona un lote para ver su ficha comercial."
        meta={
        <>
            <Badge tone="brand">{project.name}</Badge>
            <span className="text-[12px] text-brand-400">
              {number(projectLots.length)} lotes · {project.district}
            </span>
          </>
        }
        actions={
        <Gate permission="lots.export">
            <Button icon={DownloadIcon}>Exportar disponibilidad</Button>
          </Gate>
        } />
      

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <Select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setSelectedId(null);
              }}
              aria-label="Proyecto"
              className="w-[200px]">
              
              {PROJECTS.map((p) =>
              <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              )}
            </Select>
            <SearchInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar lote, manzana o cliente…"
              label="Buscar lote"
              className="w-full sm:w-64" />
            
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {STATUSES.map((status) => {
                const on = active.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatus(status)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150 ease-smooth',
                      on ?
                      LOT_STYLES[status] :
                      'border-brand-200 bg-white text-brand-300 hover:text-brand-500'
                    )}>
                    
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        status === 'Disponible' ?
                        'bg-emerald-500' :
                        status === 'Separado' ?
                        'bg-amber-500' :
                        'bg-brand-600'
                      )} />
                    
                    {status}
                    <span className="tabular">{counts[status]}</span>
                  </button>);

              })}
            </div>
          </div>

          <div className="overflow-x-auto px-5 py-5">
            {visibleCount === 0 ?
            <EmptyState
              title="Sin lotes que coincidan"
              description="Ajusta la búsqueda o vuelve a activar los estados filtrados."
              icon={MapPinIcon} /> :


            <div className="min-w-[720px] space-y-2.5">
                {blocks.map(([block, lots]) =>
              <div key={block} className="flex items-center gap-3">
                    <div className="w-16 shrink-0 text-right text-[12px] font-semibold text-brand-400">
                      {block}
                    </div>
                    <div className="flex flex-1 items-center gap-1.5 rounded-md border border-dashed border-brand-100 bg-brand-50/40 p-1.5">
                      {lots.map((lot) => {
                    const dimmed = !matches(lot);
                    const isSelected = lot.id === selectedId;
                    return (
                      <button
                        key={lot.id}
                        type="button"
                        onClick={() => setSelectedId(lot.id)}
                        aria-label={`Lote ${lot.code}, ${lot.status}, ${fmtArea(lot.area)}`}
                        title={`${lot.code} · ${lot.status} · ${currency(lot.price)}`}
                        className={cn(
                          'relative flex h-11 flex-1 flex-col items-center justify-center rounded border text-[11px] font-medium transition-[background-color,border-color,opacity] duration-150 ease-smooth',
                          LOT_STYLES[lot.status],
                          dimmed && 'opacity-25',
                          isSelected &&
                          'ring-2 ring-brand-700 ring-offset-1 ring-offset-white'
                        )}>
                        
                            <span className="tabular">{lot.code}</span>
                            <span className="text-[9px] font-normal opacity-70 tabular">
                              {lot.area} m²
                            </span>
                          </button>);

                  })}
                    </div>
                  </div>
              )}
                <div className="flex items-center gap-3 pl-[76px] pt-1 text-[11px] text-brand-300">
                  <LayersIcon className="h-3.5 w-3.5" />
                  Vía principal · acceso vehicular
                </div>
              </div>
            }
          </div>
        </Card>

        {/* Ficha del lote */}
        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader
            title={selected ? `Lote ${selected.code}` : 'Detalle del lote'}
            description={selected ? `${selected.block} · ${selected.stage}` : undefined}
            actions={selected ? <StatusBadge status={selected.status} /> : undefined} />
          
          {!selected ?
          <EmptyState
            title="Selecciona un lote"
            description="Haz clic en cualquier lote del plano para ver su ficha, precio y titular."
            icon={MapPinIcon} /> :


          <>
              <dl className="divide-y divide-brand-50">
                {[
              { label: 'Proyecto', value: project.name },
              { label: 'Tipo de lote', value: selected.type },
              { label: 'Área', value: fmtArea(selected.area) },
              { label: 'Precio por m²', value: currency(selected.pricePerM2) },
              { label: 'Precio de lista', value: currency(selected.price) },
              { label: 'Titular', value: selected.client ?? 'Sin titular' },
              { label: 'Asesor asignado', value: selected.advisor ?? 'Sin asignar' }].
              map((row) =>
              <div key={row.label} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                    <dt className="text-[12px] text-brand-400">{row.label}</dt>
                    <dd className="text-right text-[13px] font-medium text-brand-800">
                      {row.value}
                    </dd>
                  </div>
              )}
              </dl>
              <div className="space-y-2 border-t border-brand-100 px-5 py-4">
                <Gate
                permission="lots.edit"
                fallback={
                <p className="text-[12px] leading-relaxed text-brand-400">
                      Tu rol permite consultar la ficha, pero no modificar el estado del lote.
                    </p>
                }>
                
                  <Button
                  variant="primary"
                  icon={UserIcon}
                  className="w-full"
                  disabled={selected.status !== 'Disponible'}
                  onClick={() => setReserveOpen(true)}>
                  
                    {selected.status === 'Disponible' ?
                  'Separar lote' :
                  `Lote ${selected.status.toLowerCase()}`}
                  </Button>
                </Gate>
                <Gate permission="sales.create">
                  <Button
                  icon={FileTextIcon}
                  className="w-full"
                  onClick={() =>
                  toast.info('Formulario de venta', {
                    description: `Se abrirá el registro de venta del lote ${selected.code}.`
                  })
                  }>
                  
                    Registrar venta
                  </Button>
                </Gate>
                <Button
                icon={RulerIcon}
                variant="ghost"
                className="w-full"
                onClick={() =>
                toast.info('Ficha técnica', {
                  description: `Medidas perimétricas del lote ${selected.code}.`
                })
                }>
                
                  Ver ficha técnica
                </Button>
              </div>
            </>
          }
        </Card>
      </div>

      <Modal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        title={`Separar lote ${selected?.code ?? ''}`}
        description="La separación queda en estado “En revisión” hasta validar el voucher."
        footer={
        <>
            <Button onClick={() => setReserveOpen(false)}>Cancelar</Button>
            <Button
            variant="primary"
            onClick={() => {
              setReserveOpen(false);
              toast.success('Separación registrada', {
                description: `Lote ${selected?.code} pasó a estado Separado.`
              });
            }}>
            
              Confirmar separación
            </Button>
          </>
        }>
        
        <div className="space-y-3 text-[13px] text-brand-600">
          <p>
            Se generará una separación por {currency(3000)} con vigencia de 7 días calendario para{' '}
            <span className="font-medium text-brand-900">
              {selected ? `${selected.block} · ${selected.code}` : ''}
            </span>
            .
          </p>
          <div className="rounded-md border border-brand-100 bg-brand-50/60 px-4 py-3">
            <p className="text-[12px] text-brand-400">Precio de lista</p>
            <p className="text-[15px] font-semibold tabular text-brand-900">
              {selected ? currency(selected.price) : ''}
            </p>
          </div>
        </div>
      </Modal>
    </div>);

}