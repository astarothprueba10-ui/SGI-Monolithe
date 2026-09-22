import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import type { Permission } from '../../types';

interface Op {
  id: string;
  label: string;
  detail: string;
  count: number;
  to: string;
  permission: Permission;
  tone: 'warning' | 'danger' | 'info';
}

const OPS: Op[] = [
{
  id: 'OP-1',
  label: 'Vouchers por validar',
  detail: 'Requieren aprobación de Finanzas',
  count: 4,
  to: '/financiamiento',
  permission: 'financing.approve',
  tone: 'warning'
},
{
  id: 'OP-2',
  label: 'Cuotas vencidas',
  detail: 'Mora mayor a 15 días',
  count: 14,
  to: '/financiamiento',
  permission: 'financing.view',
  tone: 'danger'
},
{
  id: 'OP-3',
  label: 'Separaciones por vencer',
  detail: 'Vencen en los próximos 3 días',
  count: 5,
  to: '/ventas',
  permission: 'sales.view',
  tone: 'warning'
},
{
  id: 'OP-4',
  label: 'Leads sin asignar',
  detail: 'Captación de campañas activas',
  count: 9,
  to: '/crm',
  permission: 'crm.edit',
  tone: 'info'
},
{
  id: 'OP-5',
  label: 'Comisiones por aprobar',
  detail: 'Cierre de agosto 2026',
  count: 5,
  to: '/asesores',
  permission: 'advisors.approve',
  tone: 'info'
},
{
  id: 'OP-6',
  label: 'Faltas por justificar',
  detail: 'Equipo comercial externo',
  count: 3,
  to: '/trabajadores',
  permission: 'hr.approve',
  tone: 'warning'
},
{
  id: 'OP-7',
  label: 'Campañas sin reporte',
  detail: 'Cierre semanal pendiente',
  count: 2,
  to: '/marketing',
  permission: 'marketing.edit',
  tone: 'info'
}];


const TONES = {
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200'
};

export function PendingOperations() {
  const { can } = useAuth();
  const visible = OPS.filter((op) => can(op.permission));

  if (visible.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[13px] text-brand-400">
        No tienes operaciones pendientes asignadas a tu rol.
      </p>);

  }

  return (
    <ul className="divide-y divide-brand-50">
      {visible.slice(0, 5).map((op) =>
      <li key={op.id}>
          <Link
          to={op.to}
          className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 ease-smooth hover:bg-brand-50/70">
          
            <span
            className={cn(
              'flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-[13px] font-semibold tabular',
              TONES[op.tone]
            )}>
            
              {op.count}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-brand-800">
                {op.label}
              </span>
              <span className="block truncate text-[11px] text-brand-400">{op.detail}</span>
            </span>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-brand-200 transition-colors duration-150 ease-smooth group-hover:text-brand-500" />
          </Link>
        </li>
      )}
    </ul>);

}