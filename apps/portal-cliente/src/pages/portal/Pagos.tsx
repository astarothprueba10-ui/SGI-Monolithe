import React from 'react';
import { Link } from 'react-router-dom';
import {
  CircleAlertIcon,
  DownloadIcon,
  EyeIcon,
  ReceiptTextIcon } from
'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { RegistrarPagoForm } from '../../components/portal/RegistrarPagoForm';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { pagos } from '../../data/portal';
import { voucherEstadoLabel, voucherEstadoTone } from '../../utils/estados';
import { formatCurrency, formatDate } from '../../utils/format';

export function Pagos() {
  const enRevision = pagos.filter((p) => p.voucher === 'en_revision').length;
  const rechazados = pagos.filter((p) => p.voucher === 'rechazado').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pagos y vouchers"
        title="Tus comprobantes de pago"
        description="Registra tus pagos, revisa el estado de validación de cada voucher y consulta el motivo cuando alguno sea rechazado." />
      

      {rechazados > 0 ?
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-card border border-danger-200 bg-danger-50 px-5 py-4 sm:flex-row sm:items-center">
        
          <CircleAlertIcon
          className="h-[18px] w-[18px] shrink-0 text-danger-500"
          aria-hidden="true" />
        
          <p className="flex-1 text-[13.5px] leading-relaxed text-danger-700">
            Tienes {rechazados} voucher rechazado. Revisa el motivo más abajo y
            registra un nuevo comprobante para regularizar tu cuota.
          </p>
          <Link to="/portal/cronograma">
            <Button variant="secondary" size="sm">
              Ver cronograma
            </Button>
          </Link>
        </div> :
      null}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:items-start">
        <Card as="section">
          <CardHeader
            title="Historial de pagos"
            description={`${pagos.length} pagos registrados · ${enRevision} en revisión`}
            icon={<ReceiptTextIcon className="h-[18px] w-[18px]" />} />
          
          <ul className="divide-y divide-slateux-200">
            {pagos.map((p) =>
            <li key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-ink-800">
                      Cuota {String(p.cuota).padStart(2, '0')} ·{' '}
                      {formatCurrency(p.monto)}
                    </p>
                    <p className="mt-1 text-[13px] text-slateux-500">
                      {formatDate(p.fecha)} · {p.medio} · Op. {p.operacion}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-slateux-400">
                      {p.id} · {p.archivo}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge tone={voucherEstadoTone[p.voucher]}>
                      {voucherEstadoLabel[p.voucher]}
                    </StatusBadge>
                    <div className="flex gap-1">
                      <Button
                      variant="ghost"
                      size="sm"
                      icon={<EyeIcon className="h-4 w-4" />}>
                      
                        Ver
                      </Button>
                      <Button
                      variant="ghost"
                      size="sm"
                      icon={<DownloadIcon className="h-4 w-4" />}>
                      
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>

                {p.voucher === 'rechazado' && p.motivoRechazo ?
              <div className="mt-3 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-3">
                    <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-danger-700">
                      Motivo del rechazo
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-danger-700/90">
                      {p.motivoRechazo}
                    </p>
                  </div> :
              null}

                {p.voucher === 'en_revision' ?
              <p className="mt-3 rounded-field border border-warn-200 bg-warn-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-warn-700">
                    Cobranzas está validando este comprobante. Plazo máximo: 48
                    horas hábiles desde su registro.
                  </p> :
              null}
              </li>
            )}
          </ul>
        </Card>

        <RegistrarPagoForm />
      </div>
    </div>);

}