import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BellRingIcon,
  CircleAlertIcon,
  InfoIcon,
  TriangleAlertIcon } from
'lucide-react';
import { alertas } from '../../data/portal';
import type { AlertaNivel } from '../../types/portal';
import { Card, CardHeader } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

const estilos: Record<
  AlertaNivel,
  {wrap: string;icon: React.ReactNode;label: string;}> =
{
  critico: {
    wrap: 'border-danger-200 bg-danger-50',
    icon: <CircleAlertIcon className="h-[18px] w-[18px] text-danger-500" />,
    label: 'Requiere tu acción'
  },
  atencion: {
    wrap: 'border-warn-200 bg-warn-50',
    icon: <TriangleAlertIcon className="h-[18px] w-[18px] text-warn-500" />,
    label: 'Por vencer'
  },
  info: {
    wrap: 'border-slateux-200 bg-white',
    icon: <InfoIcon className="h-[18px] w-[18px] text-slateux-400" />,
    label: 'Informativo'
  }
};

export function AlertasPanel() {
  const [descartadas, setDescartadas] = useState<string[]>([]);
  const visibles = alertas.filter((a) => !descartadas.includes(a.id));

  return (
    <Card as="section">
      <CardHeader
        title="Alertas de tu operación"
        description="Ordenadas por prioridad. Solo información de tu lote y tus pagos."
        icon={<BellRingIcon className="h-[18px] w-[18px]" />} />
      
      {visibles.length === 0 ?
      <EmptyState
        icon={<BellRingIcon className="h-5 w-5" />}
        title="No tienes alertas pendientes"
        description="Cuando exista una cuota por vencer, un voucher en revisión o un documento nuevo, lo verás aquí." /> :


      <ul className="divide-y divide-slateux-200">
          {visibles.map((a) => {
          const estilo = estilos[a.nivel];
          return (
            <li
              key={a.id}
              className={`flex flex-col gap-3 border-l-[3px] px-5 py-4 sm:flex-row sm:items-center ${
              a.nivel === 'critico' ?
              'border-l-danger-500 bg-danger-50/40' :
              a.nivel === 'atencion' ?
              'border-l-warn-500' :
              'border-l-slateux-300'}`
              }>
              
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {estilo.icon}
                </span>
                <div className="min-w-0 flex-1 sm:px-3">
                  <p className="text-[14px] font-semibold text-ink-800">
                    {a.titulo}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slateux-600">
                    {a.detalle}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                  to={a.ruta}
                  className="inline-flex h-9 items-center gap-1.5 rounded-field px-3 text-[13px] font-semibold text-ink-700 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
                  
                    {a.accion}
                    <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  {a.nivel === 'info' ?
                <button
                  type="button"
                  onClick={() =>
                  setDescartadas((prev) => [...prev, a.id])
                  }
                  className="h-9 rounded-field px-2.5 text-[13px] font-medium text-slateux-400 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
                  
                      Descartar
                    </button> :
                null}
                </div>
              </li>);

        })}
        </ul>
      }
    </Card>);

}