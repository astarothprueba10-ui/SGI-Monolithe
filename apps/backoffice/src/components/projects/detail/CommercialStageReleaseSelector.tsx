import type { ConfiguracionProyectoResponse } from '../../../types/projectConfiguration';
import { condicionComercialLegible, inventarioPorEtapa } from '../../../lib/commercialPresentation';

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
      Marca las etapas que estarán abiertas para ventas al publicar. Las no marcadas quedarán cerradas.
      Ninguna etapa se libera automáticamente sin confirmar la publicación.
    </p>
    <div className="grid gap-2 md:grid-cols-2">
      {config.datos.etapas.map(etapa => {
        const marcada = seleccion.includes(etapa.codigo);
        const actual = inventarioPorEtapa(config, etapa.codigo);
        return <label key={etapa.codigo} className={`flex gap-3 rounded-lg border p-3 ${marcada
          ? 'border-[#4cbb17] bg-[#4cbb17]/10' : 'border-brand-200 bg-brand-50'} cursor-pointer`}>
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#4cbb17]"
            checked={marcada} disabled={disabled}
            onChange={e => onChange(etapa.codigo, e.target.checked)}/>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-900">{etapa.nombre}</span>
            <span className="block text-xs text-brand-500">{etapa.codigo} · {actual.total} lotes asignados</span>
            <span className="mt-1 block text-xs text-brand-700">
              {condicionComercialLegible(etapa.disponibilidad === 'BLOQUEADA' ? 'REGULAR' : etapa.disponibilidad)} · Actualmente {actual.disponibles} disponibles, {actual.protegidos} vendidos/reservados
            </span>
            <span className={marcada ? 'block text-xs font-semibold text-emerald-700' : 'block text-xs text-brand-500'}>{marcada ? 'Abierta al publicar' : 'Cerrada al publicar'}</span>
          </span>
        </label>;
      })}
    </div>
    <p className="text-xs text-brand-600">
      Se conservan las ventas, reservas y bloqueos individuales. La selección solo se aplica al confirmar la publicación.
    </p>
  </fieldset>;
}
