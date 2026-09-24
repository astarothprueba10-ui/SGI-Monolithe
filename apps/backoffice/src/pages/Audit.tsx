import React, { useMemo, useState } from 'react';
import { DownloadIcon, MonitorIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/Feedback';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { AUDIT_ENTRIES } from '../data/audit';
import type { AuditEntry } from '../types';

const PAGE_SIZE = 8;

export function Audit() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<'all' | AuditEntry['result']>('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const modules = Array.from(new Set(AUDIT_ENTRIES.map((e) => e.module)));

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUDIT_ENTRIES.filter((entry) => {
      const byResult = result === 'all' || entry.result === result;
      const byModule = moduleFilter === 'all' || entry.module === moduleFilter;
      const byQuery =
      q.length === 0 ||
      entry.user.toLowerCase().includes(q) ||
      entry.record.toLowerCase().includes(q) ||
      entry.ip.includes(q);
      return byResult && byModule && byQuery;
    });
  }, [query, result, moduleFilter]);

  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description="Registro de operaciones del sistema: usuario, acción, módulo, fecha, registro afectado, resultado e información técnica."
        actions={
        <Gate permission="audit.export">
            <Button icon={DownloadIcon}>Exportar bitácora</Button>
          </Gate>
        } />
      

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
            placeholder="Buscar usuario, registro o IP…"
            className="w-full sm:w-72" />
          
          <Select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por módulo"
            className="w-[220px]">
            
            <option value="all">Todos los módulos</option>
            {modules.map((m) =>
            <option key={m} value={m}>
                {m}
              </option>
            )}
          </Select>
          <Select
            value={result}
            onChange={(e) => {
              setResult(e.target.value as 'all' | AuditEntry['result']);
              setPage(1);
            }}
            aria-label="Filtrar por resultado"
            className="w-[150px]">
            
            <option value="all">Todo resultado</option>
            <option value="Éxito">Éxito</option>
            <option value="Denegado">Denegado</option>
            <option value="Error">Error</option>
          </Select>
        </div>

        {paged.length === 0 ?
        <EmptyState
          title="Sin registros"
          description="No hay operaciones que coincidan con los filtros." /> :


        <>
            <Table
            head={
            <>
                  <TH>Fecha y hora</TH>
                  <TH>Usuario</TH>
                  <TH>Acción</TH>
                  <TH>Módulo</TH>
                  <TH>Registro afectado</TH>
                  <TH>IP</TH>
                  <TH>Resultado</TH>
                </>
            }>
            
              {paged.map((entry) =>
            <TR key={entry.id} onClick={() => setDetail(entry)}>
                  <TD className="tabular text-brand-500">{entry.datetime}</TD>
                  <TD>
                    <span className="block font-medium text-brand-900">{entry.user}</span>
                    <span className="block text-[11px] text-brand-300">{entry.role}</span>
                  </TD>
                  <TD>
                    <Badge tone={entry.action === 'Eliminar' ? 'neutral' : 'brand'}>
                      {entry.action}
                    </Badge>
                  </TD>
                  <TD className="text-brand-500">{entry.module}</TD>
                  <TD>{entry.record}</TD>
                  <TD className="tabular text-brand-500">{entry.ip}</TD>
                  <TD>
                    <StatusBadge status={entry.result} />
                  </TD>
                </TR>
            )}
            </Table>
            <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={rows.length}
            onPageChange={setPage} />
          
          </>
        }
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Evento ${detail?.id ?? ''}`}
        description={detail ? `${detail.module} · ${detail.datetime}` : undefined}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}>
        
        {detail ?
        <div className="space-y-4">
            <dl className="divide-y divide-brand-50">
              {[
            { label: 'Usuario', value: `${detail.user} (${detail.role})` },
            { label: 'Acción', value: detail.action },
            { label: 'Módulo', value: detail.module },
            { label: 'Registro afectado', value: detail.record },
            { label: 'Resultado', value: detail.result },
            { label: 'Dirección IP', value: detail.ip }].
            map((row) =>
            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-[12px] text-brand-400">{row.label}</dt>
                  <dd className="text-right text-[13px] font-medium text-brand-800">
                    {row.value}
                  </dd>
                </div>
            )}
            </dl>
            <div className="flex items-center gap-2.5 rounded-md border border-brand-100 bg-brand-50/60 px-4 py-3 text-[12px] text-brand-500">
              <MonitorIcon className="h-4 w-4 shrink-0 text-brand-400" />
              {detail.device}
            </div>
          </div> :
        null}
      </Modal>
    </div>);

}