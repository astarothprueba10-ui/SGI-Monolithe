import React, { useState } from 'react';
import {
  BuildingIcon,
  ClockIcon,
  MailIcon,
  MessageSquareIcon,
  PhoneIcon } from
'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { asesor, lote } from '../../data/portal';

export function MiAsesor() {
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function contactar() {
    setEnviando(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setEnviando(false);
    setConfirmar(false);
    setEnviado(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mi asesor"
        title="Tu contacto en MONOLITHE"
        description="Tu asesora comercial acompaña tu operación desde la separación hasta la entrega del lote." />
      

      <div aria-live="polite">
        {enviado ?
        <div
          role="status"
          className="rounded-card border border-success-200 bg-success-50 px-5 py-4 text-[13.5px] leading-relaxed text-success-700">
          
            Solicitud enviada. {asesor.nombre.split(' ')[0]} te contactará al{' '}
            {asesor.telefono} dentro del horario de atención.
          </div> :
        null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
        <Card className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <img
              src={asesor.avatar}
              alt={`Fotografía de ${asesor.nombre}`}
              className="h-24 w-24 shrink-0 rounded-card border border-slateux-200 object-cover" />
            
            <div className="min-w-0">
              <h2 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-ink-800">
                {asesor.nombre}
              </h2>
              <p className="mt-1.5 text-[13.5px] text-slateux-500">
                {asesor.cargo}
              </p>
              <p className="mt-3 text-[12.5px] text-slateux-400">
                Operación asignada: {lote.manzana} {lote.numero} · {lote.etapa}
              </p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 border-t border-slateux-200 pt-6 sm:grid-cols-2">
            <Dato
              icon={<PhoneIcon className="h-4 w-4" />}
              label="Teléfono"
              value={asesor.telefono} />
            
            <Dato
              icon={<MailIcon className="h-4 w-4" />}
              label="Correo"
              value={asesor.correo} />
            
            <Dato
              icon={<ClockIcon className="h-4 w-4" />}
              label="Horario de atención"
              value={asesor.horario} />
            
            <Dato
              icon={<BuildingIcon className="h-4 w-4" />}
              label="Oficina"
              value={asesor.oficina} />
            
          </dl>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-slateux-200 pt-6">
            <Button
              icon={<MessageSquareIcon className="h-4 w-4" />}
              onClick={() => setConfirmar(true)}>
              
              Solicitar contacto
            </Button>
            <a href={`tel:${asesor.telefono.replace(/\s/g, '')}`}>
              <Button
                variant="secondary"
                icon={<PhoneIcon className="h-4 w-4" />}>
                
                Llamar
              </Button>
            </a>
            <a href={`mailto:${asesor.correo}`}>
              <Button
                variant="secondary"
                icon={<MailIcon className="h-4 w-4" />}>
                
                Escribir correo
              </Button>
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Antes de escribir"
            description="Estos temas se resuelven más rápido desde el portal." />
          
          <ul className="divide-y divide-slateux-200">
            {[
            'Consulta de cuotas y vencimientos: revisa tu cronograma de pagos.',
            'Estado de un voucher: aparece en Pagos y vouchers en tiempo real.',
            'Descarga de contrato o estado de cuenta: disponible en Documentos.'].
            map((t) =>
            <li
              key={t}
              className="px-5 py-3.5 text-[13px] leading-relaxed text-slateux-600">
              
                {t}
              </li>
            )}
          </ul>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmar}
        title="¿Solicitar contacto con tu asesora?"
        description={`Enviaremos tu solicitud a ${asesor.nombre} junto con los datos de tu operación. Te contactará dentro del horario de atención.`}
        confirmLabel="Sí, solicitar contacto"
        loading={enviando}
        onConfirm={contactar}
        onCancel={() => setConfirmar(false)} />
      
    </div>);

}

function Dato({
  icon,
  label,
  value




}: {icon: React.ReactNode;label: string;value: string;}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-slateux-400" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[12px] font-medium uppercase tracking-[0.08em] text-slateux-400">
          {label}
        </dt>
        <dd className="mt-0.5 break-words text-[13.5px] font-medium text-ink-800">
          {value}
        </dd>
      </div>
    </div>);

}