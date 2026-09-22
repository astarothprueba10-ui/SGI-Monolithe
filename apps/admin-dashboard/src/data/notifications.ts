import type { ModuleKey } from '../types';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  module: ModuleKey;
  to: string;
  tone: 'info' | 'warning' | 'danger';
}

export const NOTIFICATIONS: Notification[] = [
{
  id: 'N-01',
  title: '6 vouchers en revisión',
  description: 'Bancos BCP e Interbank — requieren validación.',
  time: 'Hace 12 min',
  module: 'financing',
  to: '/financiamiento',
  tone: 'warning'
},
{
  id: 'N-02',
  title: '14 cuotas vencidas',
  description: 'Cartera Las Palmeras — mora mayor a 15 días.',
  time: 'Hace 40 min',
  module: 'financing',
  to: '/financiamiento',
  tone: 'danger'
},
{
  id: 'N-03',
  title: 'Separación por vencer',
  description: 'Lote B-14 · Vista Alegre vence en 2 días.',
  time: 'Hace 1 h',
  module: 'sales',
  to: '/ventas',
  tone: 'warning'
},
{
  id: 'N-04',
  title: '9 leads sin asignar',
  description: 'Campaña Meta Ads “Vista Alegre Etapa 2”.',
  time: 'Hace 2 h',
  module: 'crm',
  to: '/crm',
  tone: 'info'
},
{
  id: 'N-05',
  title: 'Comisiones pendientes de aprobación',
  description: '5 asesores del cierre de agosto.',
  time: 'Hace 3 h',
  module: 'advisors',
  to: '/asesores',
  tone: 'info'
},
{
  id: 'N-06',
  title: 'Nueva campaña activa',
  description: 'Google Ads “Lotes Norte” inició hoy.',
  time: 'Hace 5 h',
  module: 'marketing',
  to: '/marketing',
  tone: 'info'
},
{
  id: 'N-07',
  title: '3 intentos de acceso denegados',
  description: 'Módulo Usuarios — revisar en auditoría.',
  time: 'Ayer',
  module: 'audit',
  to: '/auditoria',
  tone: 'danger'
}];