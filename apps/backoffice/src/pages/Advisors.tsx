import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, FileTextIcon, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { crmBackend, type CrmAdvisor } from '../services/crmBackend';
import { commissionsService, type CommissionSettlement } from '../services/commissionsService';
import { currency, number } from '../utils/format';

type AdvisorsTab = 'asesores' | 'liquidaciones';

export function Advisors() {
  const [tab, setTab] = useState<AdvisorsTab>('asesores');
  const [query, setQuery] = useState('');
  const [advisors, setAdvisors] = useState<CrmAdvisor[]>([]);
  const [settlements, setSettlements] = useState<CommissionSettlement[]>([]);
  const [advisorsLoading, setAdvisorsLoading] = useState(true);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [advisorsError, setAdvisorsError] = useState<string | null>(null);

  const fetchAdvisors = useCallback(async () => {
    setAdvisorsLoading(true);
    setAdvisorsError(null);
    try {
      const items = await crmBackend.asesores();
      setAdvisors(items);
    } catch (error: unknown) {
      setAdvisors([]);
      setAdvisorsError(error instanceof Error ? error.message : 'No fue posible consultar los asesores.');
    } finally {
      setAdvisorsLoading(false);
    }
  }, []);

  const fetchSettlements = useCallback(async () => {
    setSettlementsLoading(true);
    try {
      setSettlements(await commissionsService.getSettlements());
    } catch (error: unknown) {
      setSettlements([]);
      toast.error(error instanceof Error ? error.message : 'No fue posible consultar las liquidaciones.');
    } finally {
      setSettlementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdvisors();
    void fetchSettlements();
  }, [fetchAdvisors, fetchSettlements]);

  const handleApproveDevengo = async (commissionId: string) => {
    try {
      const result = await commissionsService.approveCommission(Number.parseInt(commissionId, 10));
      toast.success(result?.mensaje || 'Devengo aprobado conforme al contrato vigente');
      await fetchSettlements();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'No fue posible aprobar el devengo.');
    }
  };

  const search = query.trim().toLowerCase();
  const filteredAdvisors = useMemo(() => advisors.filter((advisor) =>
    !search || [advisor.nombre_completo, advisor.codigo, advisor.email, advisor.telefono]
      .some((value) => value.toLowerCase().includes(search))
  ), [advisors, search]);
  const filteredSettlements = useMemo(() => settlements.filter((item) =>
    !search || [item.advisorName, item.code, item.saleCode, item.lotCode]
      .some((value) => value.toLowerCase().includes(search))
  ), [settlements, search]);

  const totalCommissions = settlements.reduce((sum, item) => sum + item.amount, 0);
  const approvedCommissions = settlements
    .filter((item) => item.status === 'Aprobada')
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <PageHeader
        title="Asesores y comisiones"
        description="Equipo comercial real, cartera vigente y liquidaciones de comisiones. Los asesores se registran desde Trabajadores y Usuarios y roles."
      />
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Asesores operativos', value: advisorsLoading ? '—' : number(advisors.length) },
          { label: 'Comisiones generadas', value: settlementsLoading ? '—' : currency(totalCommissions) },
          { label: 'Comisiones aprobadas (devengadas)', value: settlementsLoading ? '—' : currency(approvedCommissions) }
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-[12px] text-brand-400">{item.label}</p>
            <p className="mt-1.5 text-[22px] font-semibold tabular text-brand-900">{item.value}</p>
          </Card>
        ))}
      </div>

      <Tabs
        className="mb-5"
        active={tab}
        onChange={(value) => { if (value === 'asesores' || value === 'liquidaciones') setTab(value); }}
        items={[
          { id: 'asesores', label: 'Asesores comerciales', count: advisors.length },
          { id: 'liquidaciones', label: 'Liquidación de comisiones', count: settlements.length }
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder={tab === 'asesores' ? 'Buscar asesor, código o contacto…' : 'Buscar comisión, asesor, venta o lote…'}
            className="w-full sm:w-80"
          />
          <Button size="sm" icon={RefreshCw} onClick={() => void (tab === 'asesores' ? fetchAdvisors() : fetchSettlements())}>
            Actualizar
          </Button>
        </div>

        {tab === 'asesores' && (
          advisorsLoading ? (
            <p className="p-6 text-sm text-brand-500">Cargando asesores desde el Core Service...</p>
          ) : advisorsError ? (
            <div role="alert" className="p-6 text-sm text-rose-700">
              No fue posible cargar la nómina de asesores: {advisorsError}
            </div>
          ) : filteredAdvisors.length === 0 ? (
            <EmptyState
              title="Sin asesores operativos"
              description="No hay trabajadores con cuenta activa y rol ASESOR vigente que coincidan con la búsqueda."
            />
          ) : (
            <Table head={<>
              <TH>Código</TH>
              <TH>Asesor comercial</TH>
              <TH>Correo corporativo</TH>
              <TH>Teléfono directo</TH>
              <TH>Estado</TH>
              <TH align="right">Cartera actual</TH>
            </>}>
              {filteredAdvisors.map((advisor) => (
                <TR key={advisor.id_asesor}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-800">{advisor.codigo}</TD>
                  <TD className="font-medium text-brand-900">{advisor.nombre_completo}</TD>
                  <TD className="text-brand-600">{advisor.email}</TD>
                  <TD className="text-brand-600">{advisor.telefono}</TD>
                  <TD><StatusBadge status={advisor.activo ? 'Activo' : 'Inactivo'} /></TD>
                  <TD align="right" className="font-semibold">{number(Number(advisor.leads_activos) || 0)}</TD>
                </TR>
              ))}
            </Table>
          )
        )}

        {tab === 'liquidaciones' && (
          settlementsLoading ? (
            <p className="p-6 text-sm text-brand-500">Cargando liquidaciones...</p>
          ) : filteredSettlements.length === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title="Sin liquidaciones"
              description="No existen liquidaciones para la búsqueda seleccionada."
            />
          ) : (
            <Table head={<>
              <TH>Código</TH>
              <TH>Asesor</TH>
              <TH>Venta / Lote</TH>
              <TH>Modalidad</TH>
              <TH align="right">Precio venta</TH>
              <TH align="right">Tasa</TH>
              <TH align="right">Comisión</TH>
              <TH>Contrato</TH>
              <TH>Estado</TH>
              <TH align="right">Acciones</TH>
            </>}>
              {filteredSettlements.map((item) => (
                <TR key={item.id}>
                  <TD className="font-mono text-[12px] font-semibold text-brand-900">{item.code}</TD>
                  <TD className="font-medium">{item.advisorName}</TD>
                  <TD>
                    <div className="font-mono text-[12px] text-brand-800">{item.saleCode}</div>
                    <div className="text-[11px] text-brand-400">{item.lotCode}</div>
                  </TD>
                  <TD className="text-brand-600">{item.modality}</TD>
                  <TD align="right" className="font-mono">{currency(item.salePrice)}</TD>
                  <TD align="right" className="font-mono font-medium text-brand-700">{item.rate}%</TD>
                  <TD align="right" className="font-mono font-semibold text-brand-900">{currency(item.amount)}</TD>
                  <TD>
                    <Badge tone={item.contractStatus.toUpperCase() === 'VIGENTE' ? 'accent' : 'neutral'}>
                      {item.contractStatus}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={item.status === 'Aprobada' ? 'brand' : 'neutral'}>{item.status}</Badge>
                  </TD>
                  <TD align="right">
                    {item.status === 'Pendiente' ? (
                      <Gate permission="advisors.approve">
                        <Button size="sm" variant="primary" icon={CheckIcon}
                          onClick={() => void handleApproveDevengo(item.id)}>
                          Aprobar devengo
                        </Button>
                      </Gate>
                    ) : (
                      <span className="text-[12px] font-medium text-emerald-600">Devengada</span>
                    )}
                  </TD>
                </TR>
              ))}
            </Table>
          )
        )}
      </Card>
    </div>
  );
}
