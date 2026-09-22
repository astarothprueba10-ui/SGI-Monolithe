import type { RoleName } from '../types';

export const SALES_TREND = [
{ month: 'Mar', ventas: 18, separaciones: 26 },
{ month: 'Abr', ventas: 22, separaciones: 31 },
{ month: 'May', ventas: 25, separaciones: 29 },
{ month: 'Jun', ventas: 21, separaciones: 34 },
{ month: 'Jul', ventas: 29, separaciones: 38 },
{ month: 'Ago', ventas: 34, separaciones: 41 }];


export const COLLECTION_TREND = [
{ month: 'Mar', cobrado: 312, proyectado: 360 },
{ month: 'Abr', cobrado: 348, proyectado: 380 },
{ month: 'May', cobrado: 402, proyectado: 420 },
{ month: 'Jun', cobrado: 388, proyectado: 440 },
{ month: 'Jul', cobrado: 456, proyectado: 470 },
{ month: 'Ago', cobrado: 498, proyectado: 510 }];


export interface ActivityItem {
  id: string;
  user: string;
  initials: string;
  action: string;
  target: string;
  time: string;
  module: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
{
  id: 'AC-1',
  user: 'Julio Bermúdez',
  initials: 'JB',
  action: 'aprobó el voucher',
  target: 'VCH-0089 · S/ 3,650',
  time: 'Hace 8 min',
  module: 'Pagos'
},
{
  id: 'AC-2',
  user: 'Camila Ordoñez',
  initials: 'CO',
  action: 'registró la separación',
  target: 'SEP-2026-0388 · Lote C-03',
  time: 'Hace 26 min',
  module: 'Ventas'
},
{
  id: 'AC-3',
  user: 'Silvana Rojas',
  initials: 'SR',
  action: 'convirtió el lead',
  target: 'Inversiones Perú Sur',
  time: 'Hace 1 h',
  module: 'CRM'
},
{
  id: 'AC-4',
  user: 'Marco Ledesma',
  initials: 'ML',
  action: 'actualizó el estado del lote',
  target: 'C-03 · Disponible → Separado',
  time: 'Hace 2 h',
  module: 'Lotes'
},
{
  id: 'AC-5',
  user: 'Lucía Ferrand',
  initials: 'LF',
  action: 'exportó leads de campaña',
  target: 'leads_agosto.csv',
  time: 'Hace 3 h',
  module: 'Marketing'
}];


export interface PendingOp {
  id: string;
  label: string;
  detail: string;
  count: number;
  to: string;
  permission: string;
  tone: 'warning' | 'danger' | 'info';
}

export const DASHBOARD_INTRO: Record<RoleName, {title: string;description: string;}> = {
  Administrador: {
    title: 'Dashboard general',
    description:
    'Vista consolidada de la operación comercial, financiera y administrativa de MONOLITHE.'
  },
  Asesor: {
    title: 'Dashboard comercial',
    description: 'Tu embudo, tus separaciones y la disponibilidad de lotes en tiempo real.'
  },
  Finanzas: {
    title: 'Dashboard financiero',
    description: 'Cobranza del periodo, cartera vencida y vouchers pendientes de validación.'
  },
  Marketing: {
    title: 'Dashboard de marketing',
    description: 'Rendimiento de campañas, costo por lead y calidad de la captación.'
  },
  RRHH: {
    title: 'Dashboard de gestión humana',
    description: 'Planilla comercial, comisiones por aprobar, horarios y asistencia.'
  }
};