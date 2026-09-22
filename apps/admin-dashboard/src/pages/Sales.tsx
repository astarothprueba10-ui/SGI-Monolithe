import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, FileTextIcon, PlusIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput, Select } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Modal } from '../components/ui/Modal';
import { Gate } from '../components/auth/PermissionRoute';
import { SALES } from '../data/sales';
import { currency } from '../utils/format';
import type { Sale } from '../types';

export function Sales() {
  const [tab, setTab] = useState<'todas' | 'Separación' | 'Venta'>('todas');
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState<'all' | Sale['modality']>('all');
  const [detail, setDetail] = useState<Sale | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SALES.filter((sale) => {
      const byTab = tab === 'todas' || sale.type === tab;
      const byModality = modality === 'all' || sale.modality === modality;
      const byQuery =
      q.length === 0 ||
      sale.buyer.toLowerCase().includes(q) ||
      sale.code.toLowerCase().includes(q) ||
      sale.lot.toLowerCase().includes(q);
      return byTab && byModality && byQuery;
    });
  }, [tab, query, modality]);

  const separations = SALES.filter((s) => s.type === 'Separación').length;
  const sales = SALES.filter((s) => s.type === 'Venta').length;

  return (
    <div>
      <PageHeader
        title="Separaciones y ventas"
        description="Operaciones comerciales con su comprador, lote, modalidad de venta y contrato asociado."
        actions={
        <>
            <Gate permission="sales.export">
              <Button icon={DownloadIcon}>Exportar</Button>
            </Gate>
            <Gate permission="sales.create">
              <Button icon={PlusIcon} variant="primary">
                Nueva operación
              </Button>
            </Gate>
          </>
        } />
      

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        items={[
        { id: 'todas', label: 'Todas', count: SALES.length },
        { id: 'Separación', label: 'Separaciones', count: separations },
        { id: 'Venta', label: 'Ventas', count: sales }]
        } />
      

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar por comprador, código o lote…"
            className="w-full sm:w-72" />
          
          <Select
            value={modality}
            onChange={(e) => setModality(e.target.value as 'all' | Sale['modality'])}
            aria-label="Filtrar por modalidad"
            className="w-[190px]">
            
            <option value="all">Todas las modalidades</option>
            <option value="Contado">Contado</option>
            <option value="Financiado">Financiado</option>
            <option value="Crédito bancario">Crédito bancario</option>
          </Select>
        </div>

        {rows.length === 0 ?
        <EmptyState
          title="Sin operaciones"
          description="No hay separaciones ni ventas con los filtros aplicados." /> :


        <Table
          head={
          <>
                <TH>Código</TH>
                <TH>Tipo</TH>
                <TH>Comprador</TH>
                <TH>Lote / Proyecto</TH>
                <TH>Modalidad</TH>
                <TH align="right">Monto</TH>
                <TH>Contrato</TH>
                <TH>Estado</TH>
                <TH align="right">Acciones</TH>
              </>
          }>
          
            {rows.map((sale) =>
          <TR key={sale.id} onClick={() => setDetail(sale)}>
                <TD>
                  <span className="block font-medium text-brand-900">{sale.code}</span>
                  <span className="block text-[11px] text-brand-300">{sale.date}</span>
                </TD>
                <TD>
                  <Badge tone={sale.type === 'Venta' ? 'brand' : 'neutral'}>{sale.type}</Badge>
                </TD>
                <TD>
                  <span className="block text-brand-800">{sale.buyer}</span>
                  <span className="block text-[11px] text-brand-300">{sale.document}</span>
                </TD>
                <TD className="text-brand-500">
                  <span className="block">{sale.lot}</span>
                  <span className="block text-[11px] text-brand-300">{sale.project}</span>
                </TD>
                <TD>{sale.modality}</TD>
                <TD align="right">{currency(sale.amount)}</TD>
                <TD>
                  <StatusBadge status={sale.contract} dot={false} />
                </TD>
                <TD>
                  <StatusBadge status={sale.status} />
                </TD>
                <TD align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" icon={FileTextIcon}>
                      Ficha
                    </Button>
                    {sale.status === 'En revisión' ?
                <>
                        <Gate permission="sales.approve">
                          <Button
                      size="sm"
                      variant="success"
                      icon={CheckIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success('Operación aprobada', {
                          description: `${sale.code} pasó a estado Aprobado.`
                        });
                      }}>
                      
                            Aprobar
                          </Button>
                        </Gate>
                        <Gate permission="sales.reject">
                          <Button
                      size="sm"
                      variant="danger"
                      icon={XIcon}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.error('Operación rechazada', {
                          description: `${sale.code} fue devuelta al asesor.`
                        });
                      }}>
                      
                            Rechazar
                          </Button>
                        </Gate>
                      </> :
                null}
                  </div>
                </TD>
              </TR>
          )}
          </Table>
        }
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.code ?? ''}
        description={detail ? `${detail.type} · ${detail.date}` : undefined}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}>
        
        {detail ?
        <dl className="divide-y divide-brand-50">
            {[
          { label: 'Comprador', value: detail.buyer },
          { label: 'Documento', value: detail.document },
          { label: 'Lote', value: detail.lot },
          { label: 'Proyecto', value: detail.project },
          { label: 'Modalidad de venta', value: detail.modality },
          { label: 'Monto de la operación', value: currency(detail.amount) },
          { label: 'Asesor', value: detail.advisor },
          { label: 'Contrato', value: detail.contract },
          { label: 'Estado', value: detail.status }].
          map((row) =>
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[12px] text-brand-400">{row.label}</dt>
                <dd className="text-right text-[13px] font-medium text-brand-800">{row.value}</dd>
              </div>
          )}
          </dl> :
        null}
      </Modal>
    </div>);

}