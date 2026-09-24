import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, DownloadIcon, MapIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardHeader } from '../components/ui/Card';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { Alert } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';
import { Gate } from '../components/auth/PermissionRoute';
import { TrendChart } from '../components/dashboard/TrendChart';
import type { SeriesConfig } from '../components/dashboard/TrendChart';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { PendingOperations } from '../components/dashboard/PendingOperations';
import { LotMixSummary } from '../components/dashboard/LotMixSummary';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_KPIS } from '../data/kpis';
import { COLLECTION_TREND, DASHBOARD_INTRO, SALES_TREND } from '../data/dashboard';
import { LEAD_SOURCES } from '../data/crm';
import { ADVISORS } from '../data/people';
import type { RoleName } from '../types';

interface ChartConfig {
  title: string;
  description: string;
  data: Array<Record<string, string | number>>;
  series: SeriesConfig[];
  valuePrefix?: string;
}

const CHART_BY_ROLE: Record<RoleName, ChartConfig> = {
  Administrador: {
    title: 'Ventas y separaciones por mes',
    description: 'Operaciones cerradas frente a separaciones registradas',
    data: SALES_TREND,
    series: [
    { key: 'separaciones', label: 'Separaciones', type: 'bar', color: '#C7D8E8' },
    { key: 'ventas', label: 'Ventas', type: 'line', color: '#1E3A5C' }]

  },
  Asesor: {
    title: 'Mi embudo comercial por mes',
    description: 'Separaciones generadas y ventas concretadas',
    data: SALES_TREND,
    series: [
    { key: 'separaciones', label: 'Separaciones', type: 'bar', color: '#C7D8E8' },
    { key: 'ventas', label: 'Ventas', type: 'line', color: '#1E3A5C' }]

  },
  Finanzas: {
    title: 'Cobranza vs. proyección',
    description: 'Miles de soles cobrados frente al cronograma proyectado',
    data: COLLECTION_TREND,
    series: [
    { key: 'proyectado', label: 'Proyectado', type: 'bar', color: '#C7D8E8' },
    { key: 'cobrado', label: 'Cobrado', type: 'line', color: '#1E3A5C' }],

    valuePrefix: 'S/ '
  },
  Marketing: {
    title: 'Leads por fuente de captación',
    description: 'Volumen captado y leads convertidos a separación',
    data: LEAD_SOURCES,
    series: [
    { key: 'leads', label: 'Leads', type: 'bar', color: '#C7D8E8' },
    { key: 'converted', label: 'Convertidos', type: 'line', color: '#1E3A5C' }]

  },
  RRHH: {
    title: 'Comisiones por asesor',
    description: 'Comisión y bono del cierre de agosto 2026',
    data: ADVISORS.map((a) => ({
      name: a.name.split(' ')[0],
      comision: a.commission,
      bono: a.bonus
    })),
    series: [
    { key: 'comision', label: 'Comisión', type: 'bar', color: '#C7D8E8' },
    { key: 'bono', label: 'Bono', type: 'line', color: '#1E3A5C' }],

    valuePrefix: 'S/ '
  }
};

export function Dashboard() {
  const { role, user, hasModule } = useAuth();
  const kpis = ROLE_KPIS[role];
  const intro = DASHBOARD_INTRO[role];
  const chart = CHART_BY_ROLE[role];

  return (
    <div>
      <PageHeader
        title={intro.title}
        description={intro.description}
        meta={
        <>
            <Badge tone="brand">{role}</Badge>
            <span className="text-[12px] text-brand-400">
              {kpis.length} indicadores habilitados para tu rol
            </span>
          </>
        }
        actions={
        <>
            <Select defaultValue="ago" aria-label="Periodo" className="w-[168px]">
              <option value="ago">Agosto 2026</option>
              <option value="jul">Julio 2026</option>
              <option value="q3">Trimestre III 2026</option>
            </Select>
            <Button icon={CalendarIcon}>Comparar periodo</Button>
            <Gate permission="dashboard.export">
              <Button icon={DownloadIcon} variant="primary">
                Exportar
              </Button>
            </Gate>
          </>
        } />
      

      {role === 'Finanzas' ?
      <Alert
        tone="danger"
        title="14 cuotas vencidas superan los 15 días de mora"
        className="mb-5"
        actions={
        <Link to="/financiamiento">
              <Button size="sm">Ver cartera</Button>
            </Link>
        }>
        
          Representan S/ 84,120 de la cartera de Las Palmeras y Vista Alegre.
        </Alert> :
      null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2 xl:col-span-1 xl:row-span-2">
          <KpiCard kpi={kpis[0]} featured />
        </div>
        {kpis.slice(1).map((kpi) =>
        <KpiCard key={kpi.id} kpi={kpi} />
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={chart.title}
            description={chart.description}
            actions={<Badge tone="neutral">Últimos 6 meses</Badge>} />
          
          <div className="px-3 py-4">
            <TrendChart
              data={chart.data}
              series={chart.series}
              valuePrefix={chart.valuePrefix}
              height={280} />
            
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Operaciones pendientes"
            description="Solo lo que puedes resolver con tus permisos" />
          
          <PendingOperations />
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        {hasModule('projects') || hasModule('lots') ?
        <Card className="xl:col-span-2">
            <CardHeader
            title="Resumen de lotes por proyecto"
            description="Distribución de disponibilidad del inventario activo"
            actions={
            <Gate permission="lots.view">
                  <Link to="/plano">
                    <Button size="sm" icon={MapIcon}>
                      Abrir plano
                    </Button>
                  </Link>
                </Gate>
            } />
          
            <LotMixSummary />
          </Card> :
        null}

        <Card
          className={
          hasModule('projects') || hasModule('lots') ? '' : 'xl:col-span-3'
          }>
          
          <CardHeader
            title="Actividad reciente"
            description={`Trazabilidad visible para ${user.primaryRole}`} />
          
          <ActivityFeed />
        </Card>
      </div>
    </div>);

}