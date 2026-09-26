import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, DownloadIcon, PlusIcon, FileTextIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Field';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/Feedback';
import { Gate } from '../components/auth/PermissionRoute';
import { ADVISORS } from '../data/people';
import { currency, number } from '../utils/format';
import { commissionsService, CommissionSettlement } from '../services/commissionsService';

export function Advisors() {
  const [tab, setTab] = useState<'cartera' | 'liquidaciones' | 'asistencia'>('liquidaciones');
  const [query, setQuery] = useState('');
  const [settlements, setSettlements] = useState<CommissionSettlement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const data = await commissionsService.getSettlements();
      setSettlements(data);
    } catch (err: any) {
      console.error('Error al cargar liquidaciones:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, []);

  const handleApproveDevengo = async (commissionId: string) => {
    try {
      const idNum = parseInt(commissionId, 10);
      const res = await commissionsService.approveCommission(idNum);
      toast.success(res?.mensaje || 'Devengo de comisión aprobado conforme a contrato vigente');
      await fetchSettlements();
    } catch (err: any) {
      toast.error('Error al aprobar devengo: ' + err.message);
    }
  };

  const rows = ADVISORS.filter((a) => {
    const q = query.trim().toLowerCase();
    return q.length === 0 || a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q);
  });

  const filteredSettlements = settlements.filter((s) => {
    const q = query.trim().toLowerCase();
    return (
      q.length === 0 ||
      s.advisorName.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.saleCode.toLowerCase().includes(q) ||
      s.lotCode.toLowerCase().includes(q)
    );
  });

  const totalCommissionsCalculated = settlements.reduce((s, c) => s + c.amount, 0);
  const totalCommissionsApproved = settlements
    .filter((c) => c.status === 'Aprobada')
    .reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader
        title="Asesores y comisiones"
        description="Liquidación de comisiones comerciales (3% Contado, 2% Financiado), devengo formal contra contrato y control de equipo."
        actions={
          <>
            <Gate permission="advisors.export">
              <Button icon={DownloadIcon}>Exportar liquidación</Button>
            </Gate>
            <Gate permission="advisors.create">
              <Button icon={PlusIcon} variant="primary">
                Nuevo asesor
              </Button>
            </Gate>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Asesores activos', value: number(ADVISORS.filter((a) => a.status === 'Activo').length) },
          { label: 'Comisiones generadas', value: currency(totalCommissionsCalculated || 5010) },
          { label: 'Comisiones aprobadas (devengadas)', value: currency(totalCommissionsApproved || 2160) }
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
        onChange={(t) => setTab(t as any)}
        items={[
          { id: 'liquidaciones', label: 'Liquidación de comisiones', count: settlements.length },
          { id: 'cartera', label: 'Ventas del equipo', count: ADVISORS.length },
          { id: 'asistencia', label: 'Horarios y asistencia' }
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 px-5 py-3.5">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar asesor, lote o código…"
            className="w-full sm:w-72"
          />
        </div>

        {tab === 'liquidaciones' && (
          filteredSettlements.length === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title="Sin liquidaciones"
              description="No hay comisiones calculadas con los filtros aplicados."
            />
          ) : (
            <Table>
              <thead>
                <TR isHeader>
                  <TH>Código</TH>
                  <TH>Asesor</TH>
                  <TH>Venta / Lote</TH>
                  <TH>Modalidad</TH>
                  <TH align="right">Precio Venta</TH>
                  <TH align="right">Tasa</TH>
                  <TH align="right">Comisión</TH>
                  <TH>Contrato</TH>
                  <TH>Estado</TH>
                  <TH align="right">Acciones</TH>
                </TR>
              </thead>
              <tbody>
                {filteredSettlements.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-[12px] font-semibold text-brand-900">{s.code}</TD>
                    <TD className="font-medium">{s.advisorName}</TD>
                    <TD>
                      <div className="font-mono text-[12px] text-brand-800">{s.saleCode}</div>
                      <div className="text-[11px] text-brand-400">{s.lotCode}</div>
                    </TD>
                    <TD className="text-brand-600">{s.modality}</TD>
                    <TD align="right" className="font-mono">{currency(s.salePrice)}</TD>
                    <TD align="right" className="font-mono font-medium text-brand-700">{s.rate}%</TD>
                    <TD align="right" className="font-mono font-semibold text-brand-900">
                      {currency(s.amount)}
                    </TD>
                    <TD>
                      <Badge variant={s.contractStatus === 'Vigente' ? 'success' : 'warning'}>
                        {s.contractStatus}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge variant={s.status === 'Aprobada' ? 'brand' : 'gray'}>
                        {s.status}
                      </Badge>
                    </TD>
                    <TD align="right">
                      {s.status === 'Pendiente' ? (
                        <Gate permission="advisors.approve">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={CheckIcon}
                            onClick={() => handleApproveDevengo(s.id)}
                          >
                            Aprobar devengo
                          </Button>
                        </Gate>
                      ) : (
                        <span className="text-[12px] text-emerald-600 font-medium">Devengada</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )
        )}

        {tab === 'cartera' && (
          <Table>
            <thead>
              <TR isHeader>
                <TH>Asesor</TH>
                <TH>Tipo</TH>
                <TH>Equipo</TH>
                <TH align="right">Ventas</TH>
                <TH align="right">Monto vendido</TH>
                <TH align="right">Comisión</TH>
                <TH align="right">Bono</TH>
                <TH>Estado</TH>
              </TR>
            </thead>
            <tbody>
              {rows.map((advisor) => (
                <TR key={advisor.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
                        {advisor.initials}
                      </span>
                      <span className="font-medium text-brand-900">{advisor.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={advisor.type === 'Interno' ? 'brand' : 'gray'}>
                      {advisor.type}
                    </Badge>
                  </TD>
                  <TD className="text-brand-500">{advisor.team}</TD>
                  <TD align="right">{advisor.salesCount}</TD>
                  <TD align="right">{currency(advisor.salesAmount)}</TD>
                  <TD align="right" className="font-medium text-brand-900">
                    {currency(advisor.commission)}
                  </TD>
                  <TD align="right">{advisor.bonus > 0 ? currency(advisor.bonus) : '—'}</TD>
                  <TD>
                    <StatusBadge status={advisor.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}

        {tab === 'asistencia' && (
          <Table>
            <thead>
              <TR isHeader>
                <TH>Asesor</TH>
                <TH>Horario</TH>
                <TH align="right">Faltas justificadas</TH>
                <TH align="right">Descuentos</TH>
                <TH>Estado</TH>
              </TR>
            </thead>
            <tbody>
              {rows.map((advisor) => (
                <TR key={advisor.id}>
                  <TD className="font-medium text-brand-900">{advisor.name}</TD>
                  <TD className="text-brand-500">{advisor.schedule}</TD>
                  <TD align="right">{advisor.absences}</TD>
                  <TD align="right" className={advisor.discount > 0 ? 'text-rose-700' : ''}>
                    {advisor.discount > 0 ? currency(advisor.discount) : '—'}
                  </TD>
                  <TD>
                    <StatusBadge status={advisor.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}