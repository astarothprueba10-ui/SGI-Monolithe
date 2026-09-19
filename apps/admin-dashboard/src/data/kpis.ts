import {
  AlertTriangleIcon,
  BadgePercentIcon,
  BanknoteIcon,
  CalendarClockIcon,
  CoinsIcon,
  HandCoinsIcon,
  HomeIcon,
  LandPlotIcon,
  MegaphoneIcon,
  ReceiptIcon,
  TargetIcon,
  TrendingUpIcon,
  UserCheckIcon,
  UsersIcon } from
'lucide-react';
import type { Kpi } from '../components/ui/KpiCard';
import type { RoleName } from '../types';

export const ROLE_KPIS: Record<RoleName, Kpi[]> = {
  Administrador: [
  {
    id: 'k1',
    label: 'Ventas del periodo',
    value: 'S/ 1.42M',
    delta: 12.4,
    hint: 'Agosto 2026',
    icon: TrendingUpIcon
  },
  {
    id: 'k2',
    label: 'Lotes disponibles',
    value: '233',
    delta: -4.1,
    hint: 'de 456 totales',
    icon: LandPlotIcon,
    tone: 'emerald'
  },
  {
    id: 'k3',
    label: 'Lotes separados',
    value: '57',
    delta: 8.2,
    hint: '12 por vencer',
    icon: HomeIcon,
    tone: 'amber'
  },
  {
    id: 'k4',
    label: 'Lotes vendidos',
    value: '166',
    delta: 6.5,
    hint: 'acumulado',
    icon: BadgePercentIcon,
    tone: 'brand'
  },
  {
    id: 'k5',
    label: 'Clientes activos',
    value: '312',
    delta: 3.8,
    hint: 'con cronograma vigente',
    icon: UsersIcon,
    tone: 'sky'
  },
  {
    id: 'k6',
    label: 'Cuotas vencidas',
    value: 'S/ 84,120',
    delta: -2.6,
    hint: '14 cuotas',
    icon: AlertTriangleIcon,
    tone: 'rose'
  },
  {
    id: 'k7',
    label: 'Comisiones del mes',
    value: 'S/ 68,915',
    hint: '5 por aprobar',
    icon: HandCoinsIcon,
    tone: 'amber'
  },
  {
    id: 'k8',
    label: 'Ingresos cobrados',
    value: 'S/ 688K',
    delta: 12.4,
    hint: 'flujo de agosto',
    icon: BanknoteIcon,
    tone: 'emerald'
  }],

  Asesor: [
  {
    id: 'a1',
    label: 'Mis ventas del periodo',
    value: 'S/ 486,000',
    delta: 18.2,
    hint: '9 operaciones',
    icon: TrendingUpIcon
  },
  {
    id: 'a2',
    label: 'Lotes disponibles',
    value: '233',
    hint: 'en proyectos activos',
    icon: LandPlotIcon,
    tone: 'emerald'
  },
  {
    id: 'a3',
    label: 'Mis separaciones',
    value: '6',
    delta: 5.0,
    hint: '2 por vencer',
    icon: HomeIcon,
    tone: 'amber'
  },
  {
    id: 'a4',
    label: 'Leads en negociación',
    value: '11',
    delta: 9.4,
    hint: 'de 24 asignados',
    icon: TargetIcon,
    tone: 'sky'
  },
  {
    id: 'a5',
    label: 'Mi comisión estimada',
    value: 'S/ 14,580',
    hint: 'cierre de agosto',
    icon: HandCoinsIcon,
    tone: 'brand'
  },
  {
    id: 'a6',
    label: 'Clientes activos',
    value: '28',
    hint: 'cartera asignada',
    icon: UserCheckIcon,
    tone: 'brand'
  }],

  Finanzas: [
  {
    id: 'f1',
    label: 'Cobranza del periodo',
    value: 'S/ 498K',
    delta: 9.2,
    hint: '98% de lo proyectado',
    icon: BanknoteIcon
  },
  {
    id: 'f2',
    label: 'Pagos pendientes',
    value: 'S/ 132,480',
    delta: 4.1,
    hint: '31 cuotas',
    icon: ReceiptIcon,
    tone: 'amber'
  },
  {
    id: 'f3',
    label: 'Cuotas vencidas',
    value: 'S/ 84,120',
    delta: -2.6,
    hint: '14 cuotas · mora 15d+',
    icon: AlertTriangleIcon,
    tone: 'rose'
  },
  {
    id: 'f4',
    label: 'Vouchers en revisión',
    value: '4',
    hint: 'requieren validación',
    icon: CalendarClockIcon,
    tone: 'sky'
  },
  {
    id: 'f5',
    label: 'Cuentas por cobrar',
    value: 'S/ 275K',
    hint: '5 clientes',
    icon: CoinsIcon,
    tone: 'brand'
  },
  {
    id: 'f6',
    label: 'Egresos del mes',
    value: 'S/ 371K',
    delta: 7.8,
    hint: 'obras, comisiones y pauta',
    icon: HandCoinsIcon,
    tone: 'rose'
  }],

  Marketing: [
  {
    id: 'm1',
    label: 'Leads captados',
    value: '626',
    delta: 14.8,
    hint: 'agosto 2026',
    icon: MegaphoneIcon
  },
  {
    id: 'm2',
    label: 'Costo por lead',
    value: 'S/ 87',
    delta: -6.2,
    hint: 'promedio ponderado',
    icon: CoinsIcon,
    tone: 'emerald'
  },
  {
    id: 'm3',
    label: 'Tasa de conversión',
    value: '9.4%',
    delta: 1.1,
    hint: 'lead → separación',
    icon: TargetIcon,
    tone: 'sky'
  },
  {
    id: 'm4',
    label: 'Campañas activas',
    value: '3',
    hint: 'de 5 registradas',
    icon: BadgePercentIcon,
    tone: 'brand'
  },
  {
    id: 'm5',
    label: 'Leads sin asignar',
    value: '9',
    hint: 'requieren asesor',
    icon: UsersIcon,
    tone: 'amber'
  },
  {
    id: 'm6',
    label: 'Inversión en pauta',
    value: 'S/ 49,500',
    delta: 5.4,
    hint: 'presupuesto ejecutado',
    icon: BanknoteIcon,
    tone: 'brand'
  }],

  RRHH: [
  {
    id: 'h1',
    label: 'Comisiones a liquidar',
    value: 'S/ 68,915',
    delta: 11.2,
    hint: 'cierre de agosto',
    icon: HandCoinsIcon
  },
  {
    id: 'h2',
    label: 'Trabajadores activos',
    value: '34',
    hint: '6 asesores externos',
    icon: UsersIcon,
    tone: 'brand'
  },
  {
    id: 'h3',
    label: 'Bonos aprobados',
    value: 'S/ 8,100',
    hint: '4 asesores',
    icon: BadgePercentIcon,
    tone: 'emerald'
  },
  {
    id: 'h4',
    label: 'Faltas justificadas',
    value: '7',
    delta: -12.0,
    hint: 'mes en curso',
    icon: CalendarClockIcon,
    tone: 'amber'
  },
  {
    id: 'h5',
    label: 'Descuentos aplicados',
    value: 'S/ 600',
    hint: '3 trabajadores',
    icon: ReceiptIcon,
    tone: 'rose'
  },
  {
    id: 'h6',
    label: 'Ventas del equipo',
    value: '34',
    delta: 6.5,
    hint: 'operaciones cerradas',
    icon: TrendingUpIcon,
    tone: 'sky'
  }]

};