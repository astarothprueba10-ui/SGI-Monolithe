import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BellRingIcon, CircleAlertIcon,
  InfoIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { portalCoreGet } from '../../lib/portalCoreApi';
import { ApiError } from '../../lib/apiClient';
import type { PortalAlertasResponse, NivelAlertaPortal } from '../../types/portal-documentos-alertas';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';

const estilos: Record<NivelAlertaPortal, string> = {
  critico: 'border-l-danger-500 bg-danger-50/40',
  atencion: 'border-l-warn-500 bg-warn-50/40',
  info: 'border-l-slateux-300 bg-white'
};
const rutasPermitidas = new Set(['/portal/cronograma','/portal/pagos','/portal/documentos']);

export function AlertasPanel() {
  const navigate = useNavigate();
  const [datos,setDatos] = useState<PortalAlertasResponse|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [cargando,setCargando] = useState(true);
  const [version,setVersion] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    setCargando(true); setError(null);
    void portalCoreGet<PortalAlertasResponse>('/portal-cliente/alertas',abort.signal)
      .then(v => { if(!abort.signal.aborted) setDatos(v); })
      .catch((e:unknown) => {
        if(abort.signal.aborted) return;
        setDatos(null);
        if(e instanceof ApiError && e.status===401){
          navigate('/login',{replace:true});return;
        }
        setError(e instanceof Error?e.message:'No se pudieron consultar las alertas.');
      })
      .finally(() => { if(!abort.signal.aborted) setCargando(false); });
    return () => abort.abort();
  },[version,navigate]);

  return <Card as="section">
    <CardHeader title="Alertas de mis operaciones"
      description="Cuotas, comprobantes y documentos verificados al consultar."
      icon={<BellRingIcon className="h-[18px] w-[18px]" />}
      action={<Button variant="ghost" size="sm" disabled={cargando}
        icon={<RefreshCwIcon className="h-4 w-4" />}
        onClick={() => setVersion(v => v+1)}>Actualizar</Button>}/>
    {cargando && <p role="status" className="p-5 text-sm text-slateux-600">
      Revisando vencimientos y comprobantes…
    </p>}
    {error && <p role="alert" className="p-5 text-sm text-danger-700">
      {error} No mostraremos alertas de ejemplo.
    </p>}
    {!cargando && !error && datos && datos.items.length===0 &&
      <p className="p-5 text-sm text-slateux-600">
        Sin alertas activas. Las cuotas, los vouchers y los documentos publicados
        se consultan directamente desde su expediente.
      </p>}
    {!cargando && !error && datos && datos.items.length>0 &&
      <ul className="divide-y divide-slateux-200">
        {datos.items.map(a => <li key={a.id} className={`flex flex-wrap items-start gap-3 border-l-[3px] px-5 py-4 ${estilos[a.nivel]}`}>
          {a.nivel==='critico' ? <CircleAlertIcon className="h-5 w-5 shrink-0 text-danger-600" />
            : a.nivel==='atencion' ? <TriangleAlertIcon className="h-5 w-5 shrink-0 text-warn-600" />
            : <InfoIcon className="h-5 w-5 shrink-0 text-slateux-500" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-800">{a.titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-slateux-600">{a.detalle}</p>
          </div>
          {rutasPermitidas.has(a.ruta) && <Link to={a.ruta}
            className="inline-flex items-center gap-1 rounded-field px-2.5 py-2 text-xs font-semibold text-ink-800 hover:bg-slateux-100">
            {a.accion}<ArrowRightIcon className="h-4 w-4" />
          </Link>}
        </li>)}
      </ul>}
  </Card>;
}
