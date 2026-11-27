import { useState } from 'react';
import { LockIcon, TablePropertiesIcon, ShieldCheckIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { CommercialTariffEditor } from './CommercialTariffEditor';
import { inventarioPorEtapa } from '../../../lib/commercialPresentation';
import type { ConfiguracionProyectoResponse } from '../../../types/projectConfiguration';

export function CommercialManagementPanel({ config, version }: { config: ConfiguracionProyectoResponse; version: number }) {
  const [seccion, setSeccion] = useState<'tarifas' | 'disponibilidad'>('disponibilidad');
  if (config.version !== version) return <Card className="p-5"><h2 className="font-semibold text-brand-900">Gestión comercial</h2><p role="alert" className="mt-2 text-sm text-brand-700">La versión consultada no coincide con la configuración publicada. No se mostrarán tarifas de un borrador como si fueran vigentes.</p></Card>;
  return <Card className="p-5 space-y-5">
    <header><h2 className="text-lg font-semibold text-brand-900">Gestión comercial</h2>
      <p className="text-sm text-brand-600">Configuración inicial finalizada (v{version}). No es necesario volver a publicar.</p></header>
    <div className="grid gap-2 sm:grid-cols-3">
      {['Importar Excel','Etapas iniciales','Asignaciones iniciales'].map(t => <div key={t} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500"><LockIcon className="h-4 w-4"/>{t}</div>)}
    </div>
    <nav aria-label="Gestión comercial permanente" className="flex flex-wrap gap-2">
      <Button icon={TablePropertiesIcon} variant={seccion==='tarifas'?'primary':'secondary'} onClick={() => setSeccion('tarifas')}>Matriz de tarifas</Button>
      <Button icon={ShieldCheckIcon} variant={seccion==='disponibilidad'?'primary':'secondary'} onClick={() => setSeccion('disponibilidad')}>Disponibilidad comercial</Button>
    </nav>
    {seccion === 'tarifas' ? <CommercialTariffEditor datos={config.datos} catalogos={config} readOnly onChange={() => {}}/>
      : <section className="space-y-3">
        <h3 className="font-semibold text-brand-900">Inventario por etapa comercial</h3>
        <p className="text-sm text-brand-600">Consulta los estados actuales de los lotes. No se infiere la apertura de una etapa a partir de un único lote disponible.</p>
        <div className="grid gap-2 md:grid-cols-2">{config.datos.etapas.map(e => {
          const i = inventarioPorEtapa(config,e.codigo);
          return <div key={e.codigo} className="rounded-lg border border-brand-200 p-3">
            <p className="font-semibold text-brand-900">{e.nombre}</p><p className="text-xs text-brand-500">{e.codigo} · {i.total} lotes</p>
            <p className="mt-2 text-sm text-brand-700">{i.disponibles} disponibles en inventario · {i.protegidos} vendidos o reservados</p>
          </div>;
        })}</div>
        <p className="rounded-md bg-brand-50 p-3 text-sm text-brand-700">Consulta disponible. La edición independiente de disponibilidad se habilitará cuando esté integrada con las validaciones del Core.</p>
      </section>}
  </Card>;
}
