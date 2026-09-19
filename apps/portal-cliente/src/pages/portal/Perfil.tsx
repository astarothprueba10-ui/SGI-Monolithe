import React from 'react';
import { ShieldCheckIcon, UserRoundIcon } from 'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Card, CardHeader } from '../../components/ui/Card';
import { cliente, lote } from '../../data/portal';

export function Perfil() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mi perfil"
        title="Tus datos de cliente"
        description="Si algún dato no es correcto, solicita su actualización a tu asesora comercial." />
      

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card>
          <CardHeader
            title="Datos personales"
            icon={<UserRoundIcon className="h-[18px] w-[18px]" />} />
          
          <div className="flex items-center gap-4 border-b border-slateux-200 px-5 py-5">
            <img
              src={cliente.avatar}
              alt={`Fotografía de ${cliente.nombreCompleto}`}
              className="h-16 w-16 rounded-full border border-slateux-200 object-cover" />
            
            <div>
              <p className="text-[15px] font-semibold text-ink-800">
                {cliente.nombreCompleto}
              </p>
              <p className="mt-0.5 text-[13px] text-slateux-500">
                Cliente {cliente.codigo}
              </p>
            </div>
          </div>
          <dl className="divide-y divide-slateux-200 px-5">
            <Row label="Documento de identidad" value={cliente.documento} />
            <Row label="Correo electrónico" value={cliente.correo} />
            <Row label="Teléfono" value={cliente.telefono} />
            <Row
              label="Operación asociada"
              value={`${lote.manzana} ${lote.numero} · ${lote.etapa} · ${lote.proyecto}`} />
            
          </dl>
        </Card>

        <Card className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slateux-200 bg-slateux-50 text-ink-700">
            <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-[14px] font-semibold text-ink-800">
            Tu información está protegida
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slateux-500">
            Este portal solo muestra información de tu propia operación
            inmobiliaria. Todos los accesos quedan registrados y auditados por
            MONOLITHE.
          </p>
        </Card>
      </div>
    </div>);

}

function Row({ label, value }: {label: string;value: string;}) {
  return (
    <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-[13px] text-slateux-500">{label}</dt>
      <dd className="text-[13.5px] font-medium text-ink-800 sm:text-right">
        {value}
      </dd>
    </div>);

}