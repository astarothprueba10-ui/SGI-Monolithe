import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DownloadIcon, MapIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button, IconButton } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { LOTS, PROJECTS } from '../data/projects';
import { currency, number } from '../utils/format';
import type { LotStatus } from '../types';

const PAGE_SIZE = 12;

export function Projects() {
  const [tab, setTab] = useState('proyectos');
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [status, setStatus] = useState<'all' | LotStatus>('all');
  const [page, setPage] = useState(1);

  const lots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOTS.filter((lot) => {
      const byProject = projectId === 'all' || lot.projectId === projectId;
      const byStatus = status === 'all' || lot.status === status;
      const byQuery =
      q.length === 0 ||
      lot.code.toLowerCase().includes(q) ||
      lot.block.toLowerCase().includes(q) ||
      (lot.client ?? '').toLowerCase().includes(q);
      return byProject && byStatus && byQuery;
    });
  }, [query, projectId, status]);

  const paged = lots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Proyectos y lotes"
        description="Administra proyectos, etapas, manzanas, tipos de lote, precios y estados de disponibilidad."
        actions={
        <>
            <Link to="/plano">
              <Button icon={MapIcon}>Plano interactivo</Button>
            </Link>
            <Gate permission="projects.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="projects.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo proyecto
              </Button>
            </Gate>
          </>
        } />
      

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => {
          setTab(id);
          setPage(1);
        }}
        items={[
        { id: 'proyectos', label: 'Proyectos', count: PROJECTS.length },
        { id: 'lotes', label: 'Lotes', count: LOTS.length }]
        } />
      

      {tab === 'proyectos' ?
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {PROJECTS.map((project) => {
          const soldPct = Math.round(project.sold / project.totalLots * 100);
          return (
            <Card key={project.id} className="flex flex-col">
                <CardHeader
                title={project.name}
                description={`${project.district} · ${project.stages} etapas · ${project.blocks} manzanas`}
                actions={<StatusBadge status={project.status} />} />
              
                <div className="grid grid-cols-4 divide-x divide-brand-50 border-b border-brand-100">
                  {[
                { label: 'Total', value: number(project.totalLots) },
                { label: 'Disponibles', value: number(project.available) },
                { label: 'Separados', value: number(project.reserved) },
                { label: 'Vendidos', value: number(project.sold) }].
                map((item) =>
                <div key={item.label} className="px-4 py-3">
                      <p className="text-[11px] text-brand-400">{item.label}</p>
                      <p className="mt-0.5 text-[16px] font-semibold tabular text-brand-900">
                        {item.value}
                      </p>
                    </div>
                )}
                </div>
                <div className="flex flex-1 flex-col px-5 py-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[12px] text-brand-400">Avance de venta</p>
                    <p className="text-[13px] font-semibold tabular text-brand-800">{soldPct}%</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-brand-50">
                    <span
                    className="block h-full rounded-full bg-brand-700"
                    style={{ width: `${soldPct}%` }} />
                  
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <div>
                      <p className="text-[11px] text-brand-400">Precio desde</p>
                      <p className="text-[15px] font-semibold tabular text-brand-900">
                        {currency(project.priceFrom)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link to="/plano">
                        <Button size="sm" icon={MapIcon}>
                          Ver plano
                        </Button>
                      </Link>
                      <Gate permission="projects.edit">
                        <Button size="sm" variant="secondary">
                          Editar
                        </Button>
                      </Gate>
                    </div>
                  </div>
                </div>
              </Card>);

        })}
        </div> :

      <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
            <SearchInput
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Buscar por lote, manzana o titular…"
            className="w-full sm:w-72" />
          
            <Select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por proyecto"
            className="w-[180px]">
            
              <option value="all">Todos los proyectos</option>
              {PROJECTS.map((p) =>
            <option key={p.id} value={p.id}>
                  {p.name}
                </option>
            )}
            </Select>
            <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'all' | LotStatus);
              setPage(1);
            }}
            aria-label="Filtrar por estado"
            className="w-[160px]">
            
              <option value="all">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Separado">Separado</option>
              <option value="Vendido">Vendido</option>
            </Select>
            <IconButton
            icon={SlidersHorizontalIcon}
            label="Más filtros"
            className="ml-auto border border-brand-200" />
          
          </div>

          {paged.length === 0 ?
        <EmptyState
          title="Sin resultados"
          description="No encontramos lotes con los filtros aplicados." /> :


        <>
              <Table
            head={
            <>
                    <TH>Lote</TH>
                    <TH>Proyecto</TH>
                    <TH>Etapa / Manzana</TH>
                    <TH>Tipo</TH>
                    <TH align="right">Área</TH>
                    <TH align="right">Precio</TH>
                    <TH>Titular</TH>
                    <TH>Estado</TH>
                  </>
            }>
            
                {paged.map((lot) =>
            <TR key={lot.id}>
                    <TD className="font-medium text-brand-900">{lot.code}</TD>
                    <TD>{PROJECTS.find((p) => p.id === lot.projectId)?.name}</TD>
                    <TD className="text-brand-500">
                      {lot.stage} · {lot.block}
                    </TD>
                    <TD>
                      <Badge tone="neutral">{lot.type}</Badge>
                    </TD>
                    <TD align="right">{lot.area} m²</TD>
                    <TD align="right">{currency(lot.price)}</TD>
                    <TD className="text-brand-500">{lot.client ?? '—'}</TD>
                    <TD>
                      <StatusBadge status={lot.status} />
                    </TD>
                  </TR>
            )}
              </Table>
              <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={lots.length}
            onPageChange={setPage} />
          
            </>
        }
        </Card>
      }
    </div>);

}