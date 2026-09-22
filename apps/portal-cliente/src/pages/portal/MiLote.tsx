import React from 'react';
import { Link } from 'react-router-dom';
import { DownloadIcon, LayoutPanelLeftIcon, RulerIcon } from 'lucide-react';
import { PageHeader } from '../../components/portal/PageHeader';
import { PlanoProyecto } from '../../components/portal/PlanoProyecto';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { financiamiento, lote } from '../../data/portal';
import { formatArea, formatCurrency } from '../../utils/format';

const hitos = [
{ titulo: 'Habilitación urbana', detalle: 'Avance 78%', estado: 'En curso' },
{
  titulo: 'Redes de agua y desagüe',
  detalle: 'Mz. D culminada',
  estado: 'Completado'
},
{
  titulo: 'Entrega de lote',
  detalle: 'Programada para marzo 2027',
  estado: 'Programado'
}];


export function MiLote() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mi lote"
        title={`${lote.manzana} ${lote.numero} — ${lote.etapa}`}
        description={`${lote.proyecto}. ${lote.ubicacion}`}
        action={
        <Link to="/portal/documentos">
            <Button
            variant="secondary"
            icon={<DownloadIcon className="h-4 w-4" />}>
            
              Descargar plano
            </Button>
          </Link>
        } />
      

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader
            title="Plano de la manzana"
            description="Representación simplificada de la Mz. D con la ubicación de tu lote."
            icon={<LayoutPanelLeftIcon className="h-[18px] w-[18px]" />} />
          
          <div className="p-5">
            <PlanoProyecto />
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-slateux-400">
                Ficha del lote
              </p>
              <StatusBadge tone="info">{lote.estado}</StatusBadge>
            </div>
            <p className="mt-4 text-[1.5rem] font-semibold leading-none tracking-tight text-ink-800">
              {formatCurrency(lote.precio)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-slateux-500">
              Precio de venta pactado en contrato
            </p>

            <dl className="mt-5 divide-y divide-slateux-200 border-t border-slateux-200">
              <Item label="Proyecto" value={lote.proyecto} />
              <Item label="Etapa" value={lote.etapa} />
              <Item label="Manzana" value={lote.manzana} />
              <Item label="Lote" value={lote.numero} />
              <Item label="Área" value={formatArea(lote.area)} />
              <Item
                label="Medidas"
                value={`${lote.frente} m de frente × ${lote.fondo} m de fondo`} />
              
              <Item label="Uso" value={lote.uso} />
              <Item label="Partida electrónica" value={lote.partida} />
            </dl>
          </Card>

          <Card className="p-5">
            <p className="text-[12.5px] font-medium uppercase tracking-[0.1em] text-slateux-400">
              Resumen económico
            </p>
            <dl className="mt-4 divide-y divide-slateux-200 border-t border-slateux-200">
              <Item
                label="Cuota inicial"
                value={formatCurrency(financiamiento.inicial)} />
              
              <Item
                label="Monto financiado"
                value={formatCurrency(financiamiento.montoFinanciado)} />
              
              <Item
                label="Saldo pendiente"
                value={formatCurrency(financiamiento.saldoPendiente)} />
              
            </dl>
            <Link to="/portal/cronograma" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                Ver cronograma completo
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      <Card as="section">
        <CardHeader
          title="Avance del proyecto"
          description="Información pública del proyecto donde se ubica tu lote."
          icon={<RulerIcon className="h-[18px] w-[18px]" />} />
        
        <ul className="grid gap-px bg-slateux-200 sm:grid-cols-3">
          {hitos.map((h) =>
          <li key={h.titulo} className="bg-white px-5 py-5">
              <StatusBadge
              tone={
              h.estado === 'Completado' ?
              'success' :
              h.estado === 'En curso' ?
              'warn' :
              'neutral'
              }>
              
                {h.estado}
              </StatusBadge>
              <p className="mt-3 text-[14px] font-semibold text-ink-800">
                {h.titulo}
              </p>
              <p className="mt-1 text-[13px] text-slateux-500">{h.detalle}</p>
            </li>
          )}
        </ul>
      </Card>
    </div>);

}

function Item({ label, value }: {label: string;value: string;}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[13px] text-slateux-500">{label}</dt>
      <dd className="text-right text-[13.5px] font-medium text-ink-800">
        {value}
      </dd>
    </div>);

}