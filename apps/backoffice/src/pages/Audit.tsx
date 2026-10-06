import React, { useEffect, useMemo, useState } from 'react';
import { DownloadIcon, MonitorIcon, ChevronRightIcon } from 'lucide-react';
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
import { securityApi, AuditEvent } from '../services/securityApi';

const PAGE_SIZE = 12;

type ResultadoFiltro = 'all' | 'EXITOSO' | 'FALLIDO' | 'DENEGADO';

function formatFecha(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function resultadoLabel(r: AuditEvent['resultado']): string {
  if (r === 'EXITOSO') return 'Exito';
  if (r === 'DENEGADO') return 'Denegado';
  return 'Error';
}

function nombreUsuario(ev: AuditEvent): string {
  if (ev.idUsuario === null) return 'Usuario no identificado';
  return ev.nombreUsuario ?? ev.usuarioLogin ?? String(ev.idUsuario);
}

function rolesLabel(ev: AuditEvent): string {
  if (!ev.roles || ev.roles.length === 0) return 'Sin rol';
  return ev.roles.map((r) => r.nombre).join(', ');
}

function entidadLabel(ev: AuditEvent): string {
  if (!ev.entidad) return '—';
  if (ev.idEntidad) return `${ev.entidad} #${ev.idEntidad}`;
  return ev.entidad;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-brand-300 text-[12px]">null</span>;
  return (
    <pre className="overflow-x-auto rounded-md bg-brand-50 border border-brand-100 p-3 text-[11px] text-brand-700 leading-relaxed max-h-48">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[12px] text-brand-400">{label}</dt>
      <dd className="text-right text-[13px] font-medium text-brand-800 break-all">{value ?? '—'}</dd>
    </div>
  );
}

export function Audit() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultadoFiltro>('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditEvent | null>(null);

  useEffect(() => {
    setLoading(true);
    securityApi.listarAuditoria()
      .then((data) => { setEvents(data); setError(null); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar la auditoria.');
      })
      .finally(() => setLoading(false));
  }, []);

  const modules = useMemo(
    () => Array.from(new Set(events.map((e) => e.modulo).filter(Boolean))).sort(),
    [events]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      const byResult = resultFilter === 'all' || ev.resultado === resultFilter;
      const byModule = moduleFilter === 'all' || ev.modulo === moduleFilter;
      if (!byResult || !byModule) return false;
      if (q.length === 0) return true;
      return (
        (ev.nombreUsuario ?? '').toLowerCase().includes(q) ||
        (ev.usuarioLogin ?? '').toLowerCase().includes(q) ||
        (ev.accion ?? '').toLowerCase().includes(q) ||
        (ev.modulo ?? '').toLowerCase().includes(q) ||
        (ev.entidad ?? '').toLowerCase().includes(q) ||
        (ev.idEntidad ?? '').toLowerCase().includes(q) ||
        (ev.descripcion ?? '').toLowerCase().includes(q) ||
        (ev.ipOrigen ?? '').toLowerCase().includes(q) ||
        (ev.ruta ?? '').toLowerCase().includes(q)
      );
    });
  }, [events, query, resultFilter, moduleFilter]);

  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Registro de operaciones del sistema: usuario, accion, modulo, fecha, registro afectado, resultado e informacion tecnica."
        actions={
          <Gate permission="audit.export">
            <Button icon={DownloadIcon}>Exportar bitacora</Button>
          </Gate>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Buscar usuario, accion, modulo, IP..."
            className="w-full sm:w-80"
          />

          <Select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            aria-label="Filtrar por modulo"
            className="w-[220px]"
          >
            <option value="all">Todos los modulos</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>

          <Select
            value={resultFilter}
            onChange={(e) => { setResultFilter(e.target.value as ResultadoFiltro); setPage(1); }}
            aria-label="Filtrar por resultado"
            className="w-[160px]"
          >
            <option value="all">Todo resultado</option>
            <option value="EXITOSO">Exito</option>
            <option value="DENEGADO">Denegado</option>
            <option value="FALLIDO">Error</option>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-brand-400">
            Cargando auditoria...
          </div>
        ) : error ? (
          <EmptyState title="Error al cargar auditoria" description={error} />
        ) : paged.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No hay operaciones que coincidan con los filtros."
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <TH>Fecha y hora</TH>
                  <TH>Usuario</TH>
                  <TH>Rol</TH>
                  <TH>Accion</TH>
                  <TH>Modulo</TH>
                  <TH>Entidad / Registro</TH>
                  <TH>IP</TH>
                  <TH>Resultado</TH>
                  <TH />
                </>
              }
            >
              {paged.map((ev) => (
                <TR key={ev.idEvento} onClick={() => setDetail(ev)}>
                  <TD className="tabular text-brand-500 text-[12px]">
                    {formatFecha(ev.fechaEvento)}
                  </TD>
                  <TD>
                    <span className="block font-medium text-brand-900">{nombreUsuario(ev)}</span>
                    {ev.usuarioLogin && ev.nombreUsuario && (
                      <span className="block text-[11px] text-brand-300">{ev.usuarioLogin}</span>
                    )}
                  </TD>
                  <TD className="text-[12px] text-brand-500">{rolesLabel(ev)}</TD>
                  <TD>
                    <Badge tone="brand">{ev.accion}</Badge>
                  </TD>
                  <TD className="text-brand-500">{ev.modulo}</TD>
                  <TD>{entidadLabel(ev)}</TD>
                  <TD className="tabular text-brand-500 text-[12px]">{ev.ipOrigen ?? '—'}</TD>
                  <TD>
                    <StatusBadge status={resultadoLabel(ev.resultado)} />
                  </TD>
                  <TD>
                    <ChevronRightIcon className="h-4 w-4 text-brand-300" />
                  </TD>
                </TR>
              ))}
            </Table>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={rows.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={`Evento #${detail?.idEvento ?? ''}`}
        description={detail ? `${detail.modulo} - ${formatFecha(detail.fechaEvento)}` : undefined}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}
      >
        {detail ? (
          <div className="space-y-5">
            <dl className="divide-y divide-brand-50">
              <DetailRow label="ID del evento" value={detail.idEvento} />
              <DetailRow label="Fecha y hora" value={formatFecha(detail.fechaEvento)} />
              <DetailRow label="ID usuario" value={detail.idUsuario} />
              <DetailRow label="Nombre usuario" value={detail.nombreUsuario} />
              <DetailRow label="Login" value={detail.usuarioLogin} />
              <DetailRow label="Roles" value={rolesLabel(detail)} />
              <DetailRow label="Modulo" value={detail.modulo} />
              <DetailRow label="Accion" value={detail.accion} />
              <DetailRow label="Entidad" value={detail.entidad} />
              <DetailRow label="ID entidad" value={detail.idEntidad} />
              <DetailRow label="Resultado" value={<StatusBadge status={resultadoLabel(detail.resultado)} />} />
              <DetailRow label="Descripcion" value={detail.descripcion} />
              <DetailRow label="IP origen" value={detail.ipOrigen} />
              <DetailRow label="Metodo HTTP" value={detail.metodoHttp} />
              <DetailRow label="Ruta" value={detail.ruta} />
              <DetailRow label="Request ID" value={detail.requestId} />
            </dl>

            <div className="flex items-start gap-2.5 rounded-md border border-brand-100 bg-brand-50/60 px-4 py-3 text-[12px] text-brand-500">
              <MonitorIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span className="break-all">{detail.userAgent ?? 'User agent no disponible'}</span>
            </div>

            {(detail.datosAntes !== null && detail.datosAntes !== undefined) && (
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-brand-500">Datos antes</p>
                <JsonBlock value={detail.datosAntes} />
              </div>
            )}
            {(detail.datosDespues !== null && detail.datosDespues !== undefined) && (
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-brand-500">Datos despues</p>
                <JsonBlock value={detail.datosDespues} />
              </div>
            )}
            {(detail.datosContexto !== null && detail.datosContexto !== undefined) && (
              <div className="space-y-1.5">
                <p className="text-[12px] font-medium text-brand-500">Datos de contexto</p>
                <JsonBlock value={detail.datosContexto} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
