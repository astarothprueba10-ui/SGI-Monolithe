import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarClockIcon,
  DownloadIcon,
  SearchIcon,
  XIcon } from
'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { cuotas, financiamiento, lote } from '../../data/portal';
import type { Cuota, CuotaEstado } from '../../types/portal';
import { cuotaEstadoLabel, cuotaEstadoTone } from '../../utils/estados';
import { formatCurrency, formatDate, formatLongDate } from '../../utils/format';

type Filtro = 'todas' | CuotaEstado;

const filtros: {value: Filtro;label: string;}[] = [
{ value: 'todas', label: 'Todas' },
{ value: 'pendiente', label: 'Pendientes' },
{ value: 'vencida', label: 'Vencidas' },
{ value: 'en_validacion', label: 'En validación' },
{ value: 'pagada', label: 'Pagadas' }];


export function Cronograma() {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState<Cuota | null>(null);

  const visibles = useMemo(() => {
    return cuotas.filter((c) => {
      const porEstado = filtro === 'todas' || c.estado === filtro;
      const q = busqueda.trim().toLowerCase();
      const porTexto =
      q === '' ||
      `cuota ${c.numero}`.includes(q) ||
      c.vencimiento.includes(q) ||
      String(c.numero) === q;
      return porEstado && porTexto;
    });
  }, [filtro, busqueda]);

  const avance =
  financiamiento.cuotasPagadas / financiamiento.cuotasTotales * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cronograma de pagos"
        title="Tus cuotas y vencimientos"
        description={`Plan de pagos del ${lote.manzana} ${lote.numero} — ${financiamiento.cuotasTotales} cuotas mensuales con TEA ${financiamiento.tea}%.`}
        action={
        <Button
          variant="secondary"
          icon={<DownloadIcon className="h-4 w-4" />}>
          
            Descargar cronograma
          </Button>
        } />
      

      <Card as="section" className="p-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Resumen
            label="Monto financiado"
            value={formatCurrency(financiamiento.montoFinanciado)} />
          
          <Resumen
            label="Total pagado"
            value={formatCurrency(financiamiento.totalPagado)}
            tone="success" />
          
          <Resumen
            label="Saldo pendiente"
            value={formatCurrency(financiamiento.saldoPendiente)}
            tone="strong" />
          
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slateux-400">
              Cuotas pagadas
            </p>
            <p className="mt-1.5 text-[18px] font-semibold tabular-nums text-ink-800">
              {financiamiento.cuotasPagadas} de {financiamiento.cuotasTotales}
            </p>
            <div className="mt-2.5">
              <ProgressBar
                value={avance}
                size="sm"
                label="Cuotas pagadas del total" />
              
            </div>
          </div>
        </div>
      </Card>

      <Card as="section">
        <CardHeader
          title="Detalle de cuotas"
          description={`${visibles.length} de ${cuotas.length} cuotas mostradas`}
          icon={<CalendarClockIcon className="h-[18px] w-[18px]" />} />
        

        <div className="flex flex-col gap-3 border-b border-slateux-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div
            role="group"
            aria-label="Filtrar cuotas por estado"
            className="flex flex-wrap gap-1.5">
            
            {filtros.map((f) => {
              const activo = filtro === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFiltro(f.value)}
                  aria-pressed={activo}
                  className={[
                  'h-8 rounded-full border px-3 text-[12.5px] font-medium outline-none',
                  'transition-[background-color,border-color,color] duration-150 ease-out',
                  'focus-visible:ring-2 focus-visible:ring-ink-700/25',
                  activo ?
                  'border-ink-800 bg-ink-800 text-white' :
                  'border-slateux-200 bg-white text-slateux-600 hover:border-slateux-300 hover:text-ink-700'].
                  join(' ')}>
                  
                  {f.label}
                </button>);

            })}
          </div>

          <div className="relative lg:w-64">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slateux-400"
              aria-hidden="true" />
            
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cuota o fecha"
              aria-label="Buscar cuota o fecha"
              className="h-9 w-full rounded-field border border-slateux-200 bg-white pl-9 pr-3 text-[13px] text-ink-800 shadow-field outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-slateux-400 hover:border-slateux-300 focus:border-ink-700 focus:ring-4 focus:ring-ink-700/10" />
            
          </div>
        </div>

        {visibles.length === 0 ?
        <EmptyState
          icon={<SearchIcon className="h-5 w-5" />}
          title="Sin cuotas para este filtro"
          description="Prueba con otro estado o limpia la búsqueda para ver todo tu cronograma."
          action={
          <Button
            variant="secondary"
            onClick={() => {
              setFiltro('todas');
              setBusqueda('');
            }}>
            
                Limpiar filtros
              </Button>
          } /> :


        <>
            {/* Tabla (escritorio) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Cronograma de cuotas con estado, vencimiento y fecha de pago
                </caption>
                <thead>
                  <tr className="border-b border-slateux-200 bg-slateux-50">
                    <Th>Cuota</Th>
                    <Th>Vencimiento</Th>
                    <Th align="right">Monto</Th>
                    <Th>Estado</Th>
                    <Th>Fecha de pago</Th>
                    <Th align="right">Acción</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateux-200">
                  {visibles.map((c) =>
                <tr
                  key={c.numero}
                  className="transition-colors duration-150 ease-out hover:bg-slateux-50">
                  
                      <Td>
                        <span className="font-semibold text-ink-800">
                          {String(c.numero).padStart(2, '0')}
                        </span>
                        <span className="text-slateux-400">
                          {' '}
                          / {financiamiento.cuotasTotales}
                        </span>
                      </Td>
                      <Td>{formatDate(c.vencimiento)}</Td>
                      <Td align="right">
                        <span className="tabular-nums font-medium text-ink-800">
                          {formatCurrency(c.monto)}
                        </span>
                      </Td>
                      <Td>
                        <StatusBadge tone={cuotaEstadoTone[c.estado]}>
                          {cuotaEstadoLabel[c.estado]}
                        </StatusBadge>
                      </Td>
                      <Td>
                        {c.fechaPago ?
                    formatDate(c.fechaPago) :

                    <span className="text-slateux-400">—</span>
                    }
                      </Td>
                      <Td align="right">
                        <button
                      type="button"
                      onClick={() => setDetalle(c)}
                      className="rounded-md px-2 py-1 text-[13px] font-semibold text-ink-700 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
                      
                          Ver detalle
                        </button>
                      </Td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            {/* Lista (móvil) */}
            <ul className="divide-y divide-slateux-200 md:hidden">
              {visibles.map((c) =>
            <li key={c.numero} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-ink-800">
                        Cuota {String(c.numero).padStart(2, '0')}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-slateux-500">
                        Vence {formatDate(c.vencimiento)}
                      </p>
                    </div>
                    <StatusBadge tone={cuotaEstadoTone[c.estado]}>
                      {cuotaEstadoLabel[c.estado]}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[15px] font-semibold tabular-nums text-ink-800">
                      {formatCurrency(c.monto)}
                    </p>
                    <button
                  type="button"
                  onClick={() => setDetalle(c)}
                  className="rounded-md px-2 py-1 text-[13px] font-semibold text-ink-700 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 focus-visible:ring-2 focus-visible:ring-ink-700/25">
                  
                      Ver detalle
                    </button>
                  </div>
                </li>
            )}
            </ul>
          </>
        }
      </Card>

      <DetalleCuota cuota={detalle} onClose={() => setDetalle(null)} />
    </div>);

}

function DetalleCuota({
  cuota,
  onClose



}: {cuota: Cuota | null;onClose: () => void;}) {
  return (
    <AnimatePresence>
      {cuota ?
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <motion.div
          className="absolute inset-0 bg-ink-900/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={onClose} />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de la cuota ${cuota.numero}`}
          className="relative w-full max-w-md rounded-card border border-slateux-200 bg-white shadow-card"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
          
            <div className="flex items-start justify-between gap-4 border-b border-slateux-200 px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brass-500">
                  Cuota {String(cuota.numero).padStart(2, '0')}
                </p>
                <h2 className="mt-1.5 text-[19px] font-semibold tracking-tight text-ink-800">
                  {formatCurrency(cuota.monto)}
                </h2>
              </div>
              <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slateux-400 outline-none transition-colors duration-150 ease-out hover:bg-slateux-100 hover:text-ink-700 focus-visible:ring-2 focus-visible:ring-ink-700/25">
              
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="divide-y divide-slateux-200 px-5">
              <DetalleRow
              label="Estado"
              value={
              <StatusBadge tone={cuotaEstadoTone[cuota.estado]}>
                    {cuotaEstadoLabel[cuota.estado]}
                  </StatusBadge>
              } />
            
              <DetalleRow
              label="Vencimiento"
              value={formatLongDate(cuota.vencimiento)} />
            
              <DetalleRow
              label="Fecha de pago"
              value={cuota.fechaPago ? formatDate(cuota.fechaPago) : '—'} />
            
              <DetalleRow label="Medio de pago" value={cuota.medio ?? '—'} />
              <DetalleRow
              label="Concepto"
              value={`Amortización e intereses — ${lote.manzana} ${lote.numero}`} />
            
            </dl>

            <div className="flex flex-col-reverse gap-2 border-t border-slateux-200 px-5 py-4 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
              {cuota.estado === 'pendiente' || cuota.estado === 'vencida' ?
            <Link to="/portal/pagos" onClick={onClose}>
                  <Button className="w-full sm:w-auto">Registrar pago</Button>
                </Link> :
            null}
            </div>
          </motion.div>
        </div> :
      null}
    </AnimatePresence>);

}

function DetalleRow({
  label,
  value



}: {label: string;value: React.ReactNode;}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-[13px] text-slateux-500">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium text-ink-800">
        {value}
      </dd>
    </div>);

}

function Resumen({
  label,
  value,
  tone




}: {label: string;value: string;tone?: 'success' | 'strong';}) {
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slateux-400">
        {label}
      </p>
      <p
        className={[
        'mt-1.5 text-[18px] font-semibold tabular-nums',
        tone === 'success' ? 'text-success-700' : 'text-ink-800'].
        join(' ')}>
        
        {value}
      </p>
    </div>);

}

function Th({
  children,
  align = 'left'



}: {children: React.ReactNode;align?: 'left' | 'right';}) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slateux-500 ${
      align === 'right' ? 'text-right' : 'text-left'}`
      }>
      
      {children}
    </th>);

}

function Td({
  children,
  align = 'left'



}: {children: React.ReactNode;align?: 'left' | 'right';}) {
  return (
    <td
      className={`whitespace-nowrap px-5 py-3.5 text-[13.5px] text-slateux-600 ${
      align === 'right' ? 'text-right' : 'text-left'}`
      }>
      
      {children}
    </td>);

}