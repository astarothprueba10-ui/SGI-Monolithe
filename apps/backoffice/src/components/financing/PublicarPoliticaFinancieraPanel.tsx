import { useEffect, useState } from 'react';
import { ArrowRightIcon, CheckCircle2Icon, FileCheck2Icon, LockKeyholeIcon, PencilLineIcon } from 'lucide-react';
import { formatSoles } from '../../utils/financeMoney';
import { Alert } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import type { PoliticaFinanciamientoActual } from '../../services/financingConfigService';
import {
  crearBorradorPolitica,
  financingPolicyPublicationService,
  type BorradorFinanciero,
  type VistaPreviaPolitica
} from '../../services/financingPolicyPublicationService';

type CampoNumero = 'montoSeparacion' | 'inicialMinima' | 'inicialMaxima' |
  'inicialFija' | 'tasaNominalAnualPct' | 'cuotasMin' | 'cuotasMax' |
  'diasVencimientoSeparacion';

export function PublicarPoliticaFinancieraPanel({
  politica, onPublicada
}: {
  politica: PoliticaFinanciamientoActual;
  onPublicada: () => void;
}) {
  const [borrador, setBorrador] = useState<BorradorFinanciero>(()=>crearBorradorPolitica(politica));
  const [vista, setVista] = useState<VistaPreviaPolitica | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [frase, setFrase] = useState('');
  const [codigo, setCodigo] = useState('');
  const [ensayoValidado, setEnsayoValidado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setBorrador(crearBorradorPolitica(politica));
    setVista(null);
    setConfirmado(false);
    setCodigo('');
    setEnsayoValidado(false);
    setFrase('');
    setError('');
  }, [politica.idPolitica]);

  function actualizar(cambio: Partial<BorradorFinanciero>) {
    setBorrador(prev=>({...prev,...cambio}));
    setVista(null);
    setConfirmado(false);
    setFrase('');
    setCodigo('');
    setEnsayoValidado(false);
    setError('');
    setMensaje('');
  }
  function numero(campo: CampoNumero, valor: string) {
    actualizar({[campo]: valor.trim()==='' ? null : Number(valor)});
  }
  function modoInicial(modo: BorradorFinanciero['modoInicial']) {
    actualizar({
      modoInicial: modo,
      inicialMinima: modo==='MINIMA' || modo==='RANGO' ? (borrador.inicialMinima ?? politica.inicialMinima ?? 0) : null,
      inicialMaxima: modo==='RANGO' ? (borrador.inicialMaxima ?? politica.inicialMaxima ?? 0) : null,
      inicialFija: modo==='FIJA' ? (borrador.inicialFija ?? politica.inicialFija ?? 0) : null
    });
  }

  const previsualizar=async()=>{
    setOcupado(true);setError('');setMensaje('');setCodigo('');setEnsayoValidado(false);
    try {
      const r=await financingPolicyPublicationService.previsualizar(politica.version,borrador);
      setVista(r);
    } catch(e) {
      setVista(null);
      setError(e instanceof Error?e.message:'No se pudo validar el borrador financiero.');
    } finally {setOcupado(false);}
  };

  /** Firma de prueba ligada a la huella SQL, sin crear recibo publicador ni nueva versión. */
  const ensayarTotp=async()=>{
    if(!vista || vista.publicacionHabilitada || ensayoValidado || !/^[0-9]{6}$/.test(codigo)) return;
    setOcupado(true);setError('');setMensaje('');
    const codigoTemporal=codigo;
    setCodigo('');
    try {
      const resultado=await financingPolicyPublicationService.ensayarTotp(
        vista.versionActual,borrador,codigoTemporal);
      if(!resultado.ensayoValidado || resultado.publicacionRealizada!==false ||
          resultado.versionEsperada!==vista.versionActual ||
          resultado.hashPropuesta!==vista.hashPropuesta) {
        throw new Error('El ensayo no corresponde a la versión o a las condiciones revisadas.');
      }
      setEnsayoValidado(true);
      setMensaje('Verificación de seguridad correcta. La propuesta continúa sin publicarse.');
    } catch(e) {
      setError(e instanceof Error?e.message:'No se pudo completar el ensayo TOTP.');
    } finally {setOcupado(false);}
  };

  const publicar=async()=>{
    if(!vista?.publicacionHabilitada || !confirmado ||
       frase!==`PUBLICAR V${vista.versionNueva}` || !/^[0-9]{6}$/.test(codigo)) return;
    setOcupado(true);setError('');setMensaje('');
    const firmaTotp=codigo;
    const propuesta={...borrador};
    const comprobacion={...vista};
    setCodigo(''); // El código no permanece en la pantalla después de enviarlo.
    try {
      const nonce=crypto.randomUUID();
      const recibo=await financingPolicyPublicationService.autorizar(
        politica.version,propuesta,firmaTotp,nonce);
      if(!recibo.publicacionHabilitada || recibo.hashPropuesta!==comprobacion.hashPropuesta)
        throw new Error('La propuesta cambió durante la autorización. Revalide los datos.');
      const resultado=await financingPolicyPublicationService.publicar(
        politica.version,propuesta,recibo.autorizacionId,nonce);
      if(!resultado.publicado || resultado.version!==comprobacion.versionNueva ||
          resultado.hashPropuesta!==comprobacion.hashPropuesta) {
        throw new Error('No se pudo confirmar el resultado de la publicación.');
      }
      setVista(null);setConfirmado(false);setFrase('');
      setMensaje(`Política financiera versión ${resultado.version} publicada y auditada.`);
      onPublicada();
    } catch(e) {
      setVista(null);
      setConfirmado(false);setFrase('');
      setError(e instanceof Error?e.message:'No se pudo publicar la nueva política.');
      // Un TOTP autorizado no se reintenta ni se reutiliza.
      // No asumimos éxito ni borramos el borrador ante un error de red.
    } finally {setOcupado(false);}
  };

  const formatearMonto = (monto: number | null) => monto == null ? '—' : formatSoles(monto);
  const formatearInicial = (datos: BorradorFinanciero | PoliticaFinanciamientoActual) => {
    if (datos.modoInicial === 'FIJA') return 'Fija · ' + formatearMonto(datos.inicialFija);
    if (datos.modoInicial === 'RANGO')
      return formatearMonto(datos.inicialMinima) + ' a ' + formatearMonto(datos.inicialMaxima);
    return 'Mínima · ' + formatearMonto(datos.inicialMinima);
  };
  const camposEditables: CampoNumero[] = [
    'montoSeparacion','inicialMinima','inicialMaxima','inicialFija',
    'tasaNominalAnualPct','cuotasMin','cuotasMax','diasVencimientoSeparacion'
  ];
  const cambiosPendientes = camposEditables.filter(c => borrador[c] !== politica[c]).length +
    Number(borrador.modoInicial !== politica.modoInicial);

  const comparacion = vista ? [
    { etiqueta: 'Separación', actual: formatSoles(politica.montoSeparacion),
      nueva: formatSoles(vista.condiciones.montoSeparacion),
      cambia: politica.montoSeparacion !== vista.condiciones.montoSeparacion },
    { etiqueta: 'Cuota inicial', actual: formatearInicial(politica),
      nueva: formatearInicial(vista.condiciones),
      cambia: politica.modoInicial !== vista.condiciones.modoInicial ||
        politica.inicialMinima !== vista.condiciones.inicialMinima ||
        politica.inicialMaxima !== vista.condiciones.inicialMaxima ||
        politica.inicialFija !== vista.condiciones.inicialFija },
    { etiqueta: 'Interés nominal anual', actual: politica.tasaNominalAnualPct + '%',
      nueva: vista.condiciones.tasaNominalAnualPct + '%',
      cambia: politica.tasaNominalAnualPct !== vista.condiciones.tasaNominalAnualPct },
    { etiqueta: 'Número de cuotas', actual: politica.cuotasMin + ' a ' + politica.cuotasMax,
      nueva: vista.condiciones.cuotasMin + ' a ' + vista.condiciones.cuotasMax,
      cambia: politica.cuotasMin !== vista.condiciones.cuotasMin ||
        politica.cuotasMax !== vista.condiciones.cuotasMax },
    { etiqueta: 'Vencimiento de separación', actual: politica.diasVencimientoSeparacion + ' días',
      nueva: vista.condiciones.diasVencimientoSeparacion + ' días',
      cambia: politica.diasVencimientoSeparacion !== vista.condiciones.diasVencimientoSeparacion }
  ].filter(item => item.cambia) : [];

  const entrada=(etiqueta: string, campo: CampoNumero, step: string, min='0')=><label
    className="block min-w-0 text-xs font-medium text-brand-700" key={campo}>
    <span className="flex flex-wrap items-center justify-between gap-1.5">
      <span>{etiqueta}</span>
      {borrador[campo] !== politica[campo] && <span className="font-semibold text-amber-700">
        Modificado
      </span>}
    </span>
    <Input type="number"
      className="mt-1 w-full tabular-nums"
      value={borrador[campo]??''} min={min} step={step} disabled={ocupado}
      onChange={e=>numero(campo,e.target.value)}/>
  </label>;

  return <section aria-labelledby="version-financiera-nueva"
    className="min-w-0 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
    <header className="border-b border-brand-100 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
            Versión a actualizar
          </p>
          <h3 id="version-financiera-nueva" className="mt-1 text-xl font-bold text-brand-950">
            Propuesta · Versión {politica.version + 1}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-brand-500">
            Ajuste las condiciones y revise los cambios antes de solicitar autorización.
          </p>
        </div>
        <span className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ' +
          (vista ? 'border-sky-200 bg-sky-50 text-sky-700' :
            'border-brand-200 bg-brand-50 text-brand-700')}>
          {vista ? <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden="true" />
            : <PencilLineIcon className="h-3.5 w-3.5" aria-hidden="true"/>}
          {vista ? 'Validada' : 'Borrador'}
        </span>
      </div>
    </header>

    <div className="space-y-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
        <span className="font-medium">Condiciones para futuras operaciones</span>
        <span className="font-semibold">{cambiosPendientes} {cambiosPendientes===1 ? 'campo modificado' : 'campos modificados'}</span>
      </div>

      {error && <Alert tone="danger" title="No se completó la operación">{error}</Alert>}
      {mensaje && <Alert tone="success" title="Confirmación">{mensaje}</Alert>}

      <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
        {entrada('Cuota de separación (S/)', 'montoSeparacion','0.01','0.01')}
        <label className="block min-w-0 text-xs font-medium text-brand-700">
          <span className="flex items-center justify-between gap-2">
            <span>Modalidad de inicial</span>
            {borrador.modoInicial !== politica.modoInicial && <span className="font-semibold text-amber-700">Modificado</span>}
          </span>
          <select disabled={ocupado} value={borrador.modoInicial}
            className="mt-1 min-h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-sm text-brand-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            onChange={e=>modoInicial(e.target.value as BorradorFinanciero['modoInicial'])}>
            <option value="MINIMA">Inicial mínima</option>
            <option value="RANGO">Rango de inicial</option>
            <option value="FIJA">Inicial fija</option>
          </select>
        </label>
        {borrador.modoInicial!=='FIJA' && entrada('Inicial mínima (S/)', 'inicialMinima','0.01','0')}
        {borrador.modoInicial==='RANGO' && entrada('Inicial máxima (S/)', 'inicialMaxima','0.01','0')}
        {borrador.modoInicial==='FIJA' && entrada('Inicial fija (S/)', 'inicialFija','0.01','0')}
        {entrada('Tasa nominal anual (%)', 'tasaNominalAnualPct','0.0001','0')}
        {entrada('Cuotas mínimas', 'cuotasMin','1','1')}
        {entrada('Cuotas máximas', 'cuotasMax','1','1')}
        {entrada('Vencimiento de separación (días)', 'diasVencimientoSeparacion','1','1')}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-brand-100 pt-3 text-xs text-brand-500">
        <span>Moneda: PEN</span>
        <span>Amortización: francesa</span>
        <span>Interés: tasa nominal anual</span>
      </div>
      <label className="block text-xs font-medium text-brand-700">
        Justificación del cambio
        <textarea value={borrador.motivoPublicacion}
          onChange={e=>actualizar({motivoPublicacion:e.target.value})}
          disabled={ocupado} maxLength={500} rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-brand-200 bg-white p-3 text-sm leading-relaxed text-brand-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          placeholder="Explique el motivo de la actualización de las condiciones financieras."/>
        <span className="mt-1 block text-[11px] text-brand-500">
          Mínimo 12 caracteres · {borrador.motivoPublicacion.length}/500
        </span>
      </label>

      <Button variant="primary" className="w-full sm:w-auto"
        onClick={()=>void previsualizar()}
        disabled={ocupado || cambiosPendientes===0 || borrador.motivoPublicacion.trim().length<12}>
        <FileCheck2Icon className="h-4 w-4" aria-hidden="true"/>
        {ocupado ? 'Validando condiciones…' : 'Validar propuesta'}
      </Button>

      {vista && <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-sky-800">Vista previa validada</p>
            <h4 className="mt-1 text-sm font-bold text-brand-950">
              Versión {vista.versionActual} <ArrowRightIcon className="mx-1 inline h-3.5 w-3.5" aria-hidden="true"/>
              Versión {vista.versionNueva}
            </h4>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-sky-800">
            {comparacion.length} {comparacion.length===1?'cambio':'cambios'}
          </span>
        </div>
        <div className="space-y-2">
          {comparacion.map(item=><div key={item.etiqueta}
            className="min-w-0 rounded-lg border border-brand-100 bg-white p-3">
            <p className="text-xs font-semibold text-brand-700">{item.etiqueta}</p>
            <div className="mt-1 grid grid-cols-1 items-center gap-1.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2">
              <span className="min-w-0 break-words text-brand-500 line-through decoration-brand-300">{item.actual}</span>
              <ArrowRightIcon className="hidden h-4 w-4 text-brand-400 sm:block" aria-hidden="true"/>
              <span className="min-w-0 break-words font-semibold text-brand-950">{item.nueva}</span>
            </div>
          </div>)}
        </div>
        <p className="rounded-lg bg-white px-3 py-2 text-xs text-brand-700">
          <strong>Motivo:</strong> {vista.condiciones.motivoPublicacion}
        </p>
        <details className="text-[11px] text-brand-500">
          <summary className="cursor-pointer font-medium">Información de integridad de la propuesta</summary>
          <p className="mt-1 break-all font-mono">{vista.hashPropuesta}</p>
        </details>

        {!vista.publicacionHabilitada ? <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <LockKeyholeIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true"/>
            <div>
              <p className="text-xs font-semibold text-amber-900">Publicación no habilitada</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                La propuesta se validó correctamente. Para publicar una nueva versión,
                primero debe habilitarse el procedimiento de aprobación financiera.
              </p>
            </div>
          </div>
          <details className="rounded-lg border border-brand-100 bg-white p-3">
            <summary className="cursor-pointer text-xs font-semibold text-brand-800">
              Verificación del autenticador (sin publicar)
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs leading-relaxed text-brand-600">
                Puede comprobar que su autenticador corresponde a esta propuesta.
                Esta verificación se audita, pero no autoriza ni publica cambios.
              </p>
              {!ensayoValidado ? <>
                <label className="block text-xs font-medium text-brand-800">
                  Código nuevo del autenticador (6 dígitos)
                  <Input className="mt-1 w-full" type="text" inputMode="numeric"
                    autoComplete="one-time-code" maxLength={6} value={codigo} disabled={ocupado}
                    onChange={e=>setCodigo(e.target.value.replace(/\D/g,'').slice(0,6))}/>
                </label>
                <Button variant="secondary" onClick={()=>void ensayarTotp()}
                  disabled={ocupado || codigo.length!==6}>
                  {ocupado?'Verificando…':'Verificar firma TOTP'}
                </Button>
              </> : <p role="status" className="text-xs font-semibold text-emerald-700">
                Verificación correcta. Esta política no se modificó.
              </p>}
            </div>
          </details>
        </div> : <div className="space-y-3 rounded-lg border border-brand-200 bg-white p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <LockKeyholeIcon className="h-4 w-4"/> Autorización de Gerencia
          </div>
          <label className="flex gap-2 text-xs leading-relaxed text-brand-800">
            <input type="checkbox" className="mt-0.5 shrink-0" checked={confirmado}
              disabled={ocupado} onChange={e=>setConfirmado(e.target.checked)}/>
            He revisado las condiciones y confirmo que solo aplicarán a nuevas operaciones.
          </label>
          <label className="block text-xs font-medium text-brand-800">
            Escriba PUBLICAR V{vista.versionNueva} para confirmar
            <Input className="mt-1 w-full" value={frase} disabled={ocupado}
              onChange={e=>setFrase(e.target.value.toUpperCase())}/>
          </label>
          <label className="block text-xs font-medium text-brand-800">
            Código TOTP de su autenticador
            <Input className="mt-1 w-full" type="text" inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} value={codigo} disabled={ocupado}
              onChange={e=>setCodigo(e.target.value.replace(/\D/g,'').slice(0,6))}/>
          </label>
          <Button variant="primary" className="w-full sm:w-auto"
            onClick={()=>void publicar()}
            disabled={ocupado || !confirmado || frase!=='PUBLICAR V'+vista.versionNueva || codigo.length!==6}>
            {ocupado?'Confirmando…':'Autorizar con TOTP y publicar versión '+vista.versionNueva}
          </Button>
        </div>}
      </div>}
    </div>
  </section>;
}
