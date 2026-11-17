import { useEffect, useState } from 'react';
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

const MENSAJE_BLOQUEO = 'Toda nueva política exige doble confirmación y autorización TOTP. Si no se completaron las pruebas funcionales del Bloque 3, la publicación permanece bloqueada desde PostgreSQL.';

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
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setBorrador(crearBorradorPolitica(politica));
    setVista(null);
    setConfirmado(false);
    setCodigo('');
    setFrase('');
    setError('');
  }, [politica.idPolitica]);

  function actualizar(cambio: Partial<BorradorFinanciero>) {
    setBorrador(prev=>({...prev,...cambio}));
    setVista(null);
    setConfirmado(false);
    setFrase('');
    setCodigo('');
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
    setOcupado(true);setError('');setMensaje('');
    try {
      const r=await financingPolicyPublicationService.previsualizar(politica.version,borrador);
      setVista(r);
    } catch(e) {
      setVista(null);
      setError(e instanceof Error?e.message:'No se pudo validar el borrador financiero.');
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

  const entrada=(etiqueta:string,campo:CampoNumero,step:string,min='0')=><label
    className="block text-xs font-medium text-brand-700" key={campo}>
    {etiqueta}
    <Input type="number" className="mt-1" value={borrador[campo]??''}
      min={min} step={step} disabled={ocupado}
      onChange={e=>numero(campo,e.target.value)}/>
  </label>;

  return <section className="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5 space-y-4">
    <div>
      <h4 className="text-sm font-bold text-brand-950">Propuesta de nueva política financiera</h4>
      <p className="mt-1 text-xs text-brand-600">
        Borrador sobre la versión {politica.version}. La validación calcula un hash canónico
        en PostgreSQL; el histórico y las operaciones vigentes no se reescriben.
      </p>
    </div>

    <Alert tone="warning" title="Publicación protegida">{MENSAJE_BLOQUEO}</Alert>
    {error && <Alert tone="danger" title="No se completó la operación">{error}</Alert>}
    {mensaje && <Alert tone="success" title="Operación registrada">{mensaje}</Alert>}

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entrada('Separación (S/)', 'montoSeparacion','0.01','0.01')}
      <label className="block text-xs font-medium text-brand-700">
        Modalidad de inicial
        <select disabled={ocupado} value={borrador.modoInicial}
          className="mt-1 h-9 w-full rounded-md border border-brand-200 bg-white px-3 text-sm text-brand-800"
          onChange={e=>modoInicial(e.target.value as BorradorFinanciero['modoInicial'])}>
          <option value="MINIMA">Inicial mínima</option>
          <option value="RANGO">Rango de inicial</option>
          <option value="FIJA">Inicial fija</option>
        </select>
      </label>
      {borrador.modoInicial!=='FIJA' && entrada('Inicial mínima (S/)', 'inicialMinima','0.01','0')}
      {borrador.modoInicial==='RANGO' && entrada('Inicial máxima (S/)', 'inicialMaxima','0.01','0')}
      {borrador.modoInicial==='FIJA' && entrada('Inicial fija (S/)', 'inicialFija','0.01','0')}
      {entrada('Interés nominal anual (%)', 'tasaNominalAnualPct','0.0001','0')}
      {entrada('Cuotas mínimas', 'cuotasMin','1','1')}
      {entrada('Cuotas máximas', 'cuotasMax','1','1')}
      {entrada('Vencimiento separación (días)', 'diasVencimientoSeparacion','1','1')}
    </div>

    <p className="text-xs text-brand-500">Moneda: PEN · Sistema de amortización: francés · interés nominal anual.</p>
    <label className="block text-xs font-medium text-brand-700">
      Justificación de la nueva versión (12 a 500 caracteres)
      <textarea value={borrador.motivoPublicacion}
        onChange={e=>actualizar({motivoPublicacion:e.target.value})}
        disabled={ocupado} maxLength={500} rows={3}
        className="mt-1 w-full rounded-md border border-brand-200 p-3 text-sm text-brand-800"
        placeholder="Describa qué cambia y por qué es necesaria la nueva política."/>
    </label>

    <Button variant="secondary" onClick={()=>void previsualizar()}
      disabled={ocupado || borrador.motivoPublicacion.trim().length<12}>
      {ocupado ? 'Procesando…' : 'Validar borrador y ver vista previa'}
    </Button>

    {vista && <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
      <h5 className="text-sm font-bold text-brand-900">
        Revisión final · Versión {vista.versionActual} → {vista.versionNueva}
      </h5>
      <p className="text-xs text-brand-700">{vista.mensaje}</p>
      <div className="grid grid-cols-1 gap-2 text-xs text-brand-800 sm:grid-cols-2">
        <p>Separación: S/ {vista.condiciones.montoSeparacion}</p>
        <p>Inicial: {vista.condiciones.modoInicial} · mínima S/ {vista.condiciones.inicialMinima??'—'} · máxima S/ {vista.condiciones.inicialMaxima??'—'} · fija S/ {vista.condiciones.inicialFija??'—'}</p>
        <p>Tasa nominal anual: {vista.condiciones.tasaNominalAnualPct}%</p>
        <p>Cuotas: {vista.condiciones.cuotasMin} a {vista.condiciones.cuotasMax}</p>
        <p>Separación vigente: {vista.condiciones.diasVencimientoSeparacion} días</p>
        <p>Moneda / sistema: PEN / FRANCES</p>
      </div>
      <p className="text-xs text-brand-700">
        <strong>Justificación:</strong> {vista.condiciones.motivoPublicacion}
      </p>
      <p className="break-all text-[10px] font-mono text-brand-500">Huella de propuesta: {vista.hashPropuesta}</p>
      {!vista.publicacionHabilitada ? <Alert tone="warning" title="Validación completada, publicación suspendida">
        La propuesta puede revisarse, pero no se solicitará TOTP ni se enviará ninguna publicación
        mientras el interruptor de seguridad esté deshabilitado en TEST.
      </Alert> : <div className="space-y-3 rounded-lg border border-brand-200 bg-white p-3">
        <label className="flex gap-2 text-xs text-brand-800">
          <input type="checkbox" checked={confirmado} disabled={ocupado}
            onChange={e=>setConfirmado(e.target.checked)} />
          He revisado condiciones, impacto y justificación. Confirmo una nueva versión
          solo para operaciones futuras, sin recalcular contratos ni cronogramas existentes.
        </label>
        <label className="block text-xs font-medium text-brand-800">
          Escriba PUBLICAR V{vista.versionNueva} para confirmar
          <Input className="mt-1" value={frase} disabled={ocupado}
            onChange={e=>setFrase(e.target.value.toUpperCase())}/>
        </label>
        <label className="block text-xs font-medium text-brand-800">
          Código de autenticador TOTP (6 dígitos)
          <Input className="mt-1" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} value={codigo} disabled={ocupado}
            onChange={e=>setCodigo(e.target.value.replace(/\D/g,'').slice(0,6))}/>
        </label>
        <Button variant="primary" onClick={()=>void publicar()}
          disabled={ocupado || !confirmado || frase!==`PUBLICAR V${vista.versionNueva}` || codigo.length!==6}>
          {ocupado ? 'Confirmando…' : `Autorizar con TOTP y publicar versión ${vista.versionNueva}`}
        </Button>
      </div>}
    </div>}
  </section>;
}
