import type { ConfiguracionProyectoResponse } from '../../../types/projectConfiguration';
import { condicionComercialLegible, contarLotesPorEtapa } from '../../../lib/commercialPresentation';

type Props = {
  config: ConfiguracionProyectoResponse;
  seleccion: string[];
  disabled: boolean;
  onChange: (codigo: string, checked: boolean) => void;
};

export function CommercialStageReleaseSelector({ config, seleccion, disabled, onChange }: Props) {
  return <fieldset className="space-y-3" disabled={disabled}>
    <legend className="text-sm font-semibold text-brand-900">Liberación de lotes por etapa comercial</legend>
    <p className="text-sm text-brand-600">
      Elige qué etapas podrán pasar de «No habilitado para ventas» a «Disponible en inventario».
      Ninguna etapa se libera automáticamente.
    </p>
    <div className="grid gap-2 md:grid-cols-2">
      {config.datos.etapas.map(etapa => {
        const bloqueada = etapa.disponibilidad === 'BLOQUEADA';
        const marcada = seleccion.includes(etapa.codigo);
        const asignados = contarLotesPorEtapa(config, etapa.codigo);
        return <label key={etapa.codigo} className={`flex gap-3 rounded-lg border p-3 ${marcada
          ? 'border-[#4cbb17] bg-[#4cbb17]/10' : 'border-brand-200 bg-white'} ${bloqueada ? 'opacity-70' : 'cursor-pointer'}`}>
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#4cbb17]"
            checked={marcada} disabled={disabled || bloqueada}
            onChange={e => onChange(etapa.codigo, e.target.checked)}/>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-900">{etapa.nombre}</span>
            <span className="block text-xs text-brand-500">{etapa.codigo} · {asignados} lotes asignados</span>
            <span className="mt-1 block text-xs text-brand-700">
              {bloqueada ? 'Bloqueada: no se puede liberar' : condicionComercialLegible(etapa.disponibilidad)}
            </span>
          </span>
        </label>;
      })}
    </div>
    <p className="text-xs text-brand-600">
      Las etapas no seleccionadas conservan su estado actual de inventario. Si un lote ya está
      disponible, desmarcar su etapa no lo bloquea ni revierte publicaciones anteriores.
    </p>
  </fieldset>;
}
