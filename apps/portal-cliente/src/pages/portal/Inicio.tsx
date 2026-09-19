import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  ClockIcon,
  MapPinnedIcon,
  ReceiptTextIcon } from
'lucide-react';
import { AlertasPanel } from '../../components/portal/AlertasPanel';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cuotas, financiamiento, lote, pagos } from '../../data/portal';
import {
  cuotaEstadoLabel,
  cuotaEstadoTone,
  voucherEstadoLabel,
  voucherEstadoTone } from
'../../utils/estados';
import {
  daysUntil,
  formatArea,
  formatCurrency,
  formatDate,
  formatLongDate } from
'../../utils/format';

export function Inicio() {
  const proximaCuota = cuotas.find((c) => c.estado === 'pendiente')!;
  const cuotaVencida = cuotas.find((c) => c.estado === 'vencida');
  const ultimoPago = pagos[0];
  const avance = financiamiento.totalPagado / financiamiento.precioTotal * 100;
  const dias = daysUntil(proximaCuota.vencimiento);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumen de mi compra"
        title="Estado de tu lote y tus pagos"
        description={`${lote.proyecto} · ${lote.etapa} · ${lote.manzana} ${lote.numero}`}
        action={
        <Link to="/portal/pagos">
            <Button icon={<ReceiptTextIcon className="h-4 w-4" />}>
              Registrar un pago
            </Button>
          </Link>
        } />
      

      {/* Panel primario: obligación de pago vigente */}
      <section className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card className="flex flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-slateux-400">
                Próxima cuota
              </p>
              <p className="mt-2 text-[2.4rem] font-semibold leading-none tracking-tight text-ink-800">
                {formatCurrency(proximaCuota.monto)}
              </p>
              <p className="mt-2.5 text-[13.5px] text-slateux-500">
                Cuota {proximaCuota.numero} de {financiamiento.cuotasTotales} ·
                vence el {formatLongDate(proximaCuota.vencimiento)}
              </p>
            </div>
            <StatusBadge tone={cuotaEstadoTone[proximaCuota.estado]}>
              {cuotaEstadoLabel[proximaCuota.estado]}
            </StatusBadge>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 rounded-field border border-warn-200 bg-warn-50 px-3.5 py-2.5">
              <ClockIcon
                className="h-4 w-4 shrink-0 text-warn-500"
                aria-hidden="true" />
              
              <p className="text-[13px] text-warn-700">
                {dias >= 0 ?
                `Vence en ${dias} día${dias === 1 ? '' : 's'}. Registra tu voucher el mismo día del pago.` :
                `Venció hace ${Math.abs(dias)} días. Regulariza para evitar mora.`}
              </p>
            </div>
            {cuotaVencida ?
            <div className="flex items-center gap-2 rounded-field border border-danger-200 bg-danger-50 px-3.5 py-2.5">
                <ClockIcon
                className="h-4 w-4 shrink-0 text-danger-500"
                aria-hidden="true" />
              
                <p className="text-[13px] text-danger-700">
                  Además, la cuota {cuotaVencida.numero} figura vencida por{' '}
                  {formatCurrency(cuotaVencida.monto)}.
                </p>
              </div> :
            null}
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <Link to="/portal/cronograma">
              <Button variant="primary">Ver detalle de la cuota</Button>
            </Link>
            <Link to="/portal/pagos">
              <Button variant="secondary">Subir voucher</Button>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-slateux-400">
            Estado de financiamiento
          </p>

          <div className="mt-5 flex items-baseline justify-between">
            <p className="text-[15px] font-semibold text-ink-800">
              {avance.toFixed(1)}% del precio pagado
            </p>
            <p className="text-[12.5px] text-slateux-500">
              {financiamiento.cuotasPagadas}/{financiamiento.cuotasTotales}{' '}
              cuotas
            </p>
          </div>
          <div className="mt-2.5">
            <ProgressBar value={avance} label="Avance del financiamiento" />
          </div>

          <dl className="mt-6 divide-y divide-slateux-200 border-t border-slateux-200">
            <Row
              label="Monto financiado"
              value={formatCurrency(financiamiento.montoFinanciado)} />
            
            <Row
              label="Total pagado"
              value={formatCurrency(financiamiento.totalPagado)}
              tone="success" />
            
            <Row
              label="Saldo pendiente"
              value={formatCurrency(financiamiento.saldoPendiente)}
              strong />
            
            <Row label="TEA aplicada" value={`${financiamiento.tea}%`} />
          </dl>
        </Card>
      </section>

      {/* Panel secundario */}
      <section className="grid gap-5 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader
            title="Mi lote"
            icon={<MapPinnedIcon className="h-[18px] w-[18px]" />}
            action={<StatusBadge tone="info">{lote.estado}</StatusBadge>} />
          
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-5">
            <Field label="Proyecto" value={lote.proyecto} span />
            <Field label="Etapa" value={lote.etapa} />
            <Field label="Manzana" value={lote.manzana} />
            <Field label="Lote" value={lote.numero} />
            <Field label="Área" value={formatArea(lote.area)} />
          </dl>
          <div className="mt-auto border-t border-slateux-200 px-5 py-3.5">
            <Link
              to="/portal/lote"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-700 outline-none transition-colors duration-150 ease-out hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-ink-700/25">
              
              Ver ficha completa y plano
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Último pago registrado"
            icon={<CalendarClockIcon className="h-[18px] w-[18px]" />}
            action={
            <StatusBadge tone={voucherEstadoTone[ultimoPago.voucher]}>
                {voucherEstadoLabel[ultimoPago.voucher]}
              </StatusBadge>
            } />
          
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-5">
            <Field label="Fecha de pago" value={formatDate(ultimoPago.fecha)} />
            <Field label="Monto" value={formatCurrency(ultimoPago.monto)} />
            <Field label="Cuota" value={`Cuota ${ultimoPago.cuota}`} />
            <Field label="Medio" value={ultimoPago.medio} />
          </dl>
          <div className="px-5 pb-5">
            <p className="flex items-start gap-2 rounded-field border border-slateux-200 bg-slateux-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slateux-600">
              <CheckCircle2Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-slateux-400"
                aria-hidden="true" />
              
              Comprobante recibido. Cobranzas valida los vouchers en un máximo
              de 48 horas hábiles.
            </p>
          </div>
          <div className="mt-auto border-t border-slateux-200 px-5 py-3.5">
            <Link
              to="/portal/pagos"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-700 outline-none transition-colors duration-150 ease-out hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-ink-700/25">
              
              Ver todos mis pagos y vouchers
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>
      </section>

      <AlertasPanel />
    </div>);

}

function Row({
  label,
  value,
  strong = false,
  tone





}: {label: string;value: string;strong?: boolean;tone?: 'success';}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-[13px] text-slateux-500">{label}</dt>
      <dd
        className={[
        'text-[13.5px] tabular-nums',
        strong ? 'font-semibold text-ink-800' : 'font-medium',
        tone === 'success' ? 'text-success-700' : 'text-ink-700'].
        join(' ')}>
        
        {value}
      </dd>
    </div>);

}

function Field({
  label,
  value,
  span = false




}: {label: string;value: string;span?: boolean;}) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <dt className="text-[12px] font-medium uppercase tracking-[0.08em] text-slateux-400">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-medium text-ink-800">{value}</dd>
    </div>);

}