import { useEffect, useState } from 'react';
import { ShieldCheckIcon, LockKeyholeIcon } from 'lucide-react';
import { Alert } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { clearStoredSession } from '../../lib/authSession';
import {
  financingMfaService, type EstadoMfaFinanciero
} from '../../services/financingMfaService';

type Fase = 'INICIO' | 'EMAIL' | 'CONFIGURAR' | 'RESPALDO';
type Operacion = 'ENROLAR' | 'REVOCAR' | 'RECUPERAR';

/** Secreto y respaldos solo en memoria de este componente; nunca localStorage ni URL. */
export function SeguridadFinancieraTotpPanel() {
  const [estado, setEstado] = useState<EstadoMfaFinanciero | null>(null);
  const [fase, setFase] = useState<Fase>('INICIO');
  const [operacion, setOperacion] = useState<Operacion>('ENROLAR');
  const [password, setPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [secreto, setSecreto] = useState('');
  const [respaldo, setRespaldo] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const recargar = async () => {
    const res = await financingMfaService.estado();
    setEstado(res);
    if (res.habilitado && fase !== 'RESPALDO') setOperacion('REVOCAR');
  };

  useEffect(() => {
    let activo = true;
    financingMfaService.estado()
      .then(data => {
        if (!activo) return;
        setEstado(data);
        setOperacion(data.habilitado ? 'REVOCAR' : 'ENROLAR');
      })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'Error consultando MFA'); });
    return () => { activo = false; };
  }, []);

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true); setError(''); setAviso('');
    try { await accion(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No fue posible verificar la solicitud.'); }
    finally { setOcupado(false); }
  }

  const iniciar = () => void ejecutar(async () => {
    const contrasenaActual = password;
    setPassword(''); // No retener credencial ante error de red o de validación.
    await financingMfaService.iniciar(contrasenaActual);
    setEmailCode('');
    setTotpCode('');
    setRecoveryCode('');
    setSecreto('');
    setRespaldo([]);
    setFase('EMAIL');
    setAviso('Se envió un código al correo corporativo verificado. Caduca en 5 minutos.');
  });

  const validarEmail = () => void ejecutar(async () => {
    if (operacion === 'ENROLAR') {
      const datos = await financingMfaService.enrolar(emailCode);
      setSecreto(datos.secreto);
      setEmailCode('');
      setFase('CONFIGURAR');
      setAviso('Agregue la clave a una aplicación autenticadora y confirme con sus 6 dígitos.');
    } else if (operacion === 'REVOCAR') {
      await financingMfaService.revocar(emailCode, totpCode);
      clearStoredSession();
      window.location.replace('/login');
    } else {
      await financingMfaService.recuperar(emailCode, recoveryCode);
      clearStoredSession();
      window.location.replace('/login');
    }
  });

  const confirmar = () => void ejecutar(async () => {
    const resultado = await financingMfaService.confirmar(totpCode);
    setTotpCode('');
    setSecreto('');
    setRespaldo(resultado.codigosRecuperacion);
    setFase('RESPALDO');
    setEstado(prev => prev ? {...prev, habilitado:true,enrolamientoPendiente:false} : null);
  });

  if (!estado && !error) return <p className="p-4 text-sm text-brand-500">Consultando seguridad TOTP…</p>;

  return <section className="rounded-2xl border border-brand-100 bg-white p-4 sm:p-5 space-y-4">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
        <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h4 className="text-sm font-bold text-brand-900">Autenticación reforzada de Gerencia</h4>
        <p className="text-xs text-brand-600">
          {estado?.habilitado ? 'Autenticador activado' : 'Autenticador aún no activado'}
          {' · '}La publicación de políticas continúa bloqueada
        </p>
      </div>
    </div>

    {!estado?.configurado && <Alert tone="warning" title="Configuración del servidor pendiente">
      Seguridad debe configurar la clave de cifrado TOTP en Auth Service para habilitar el alta.
      No se puede continuar mientras falte.
    </Alert>}
    {error && <Alert tone="danger" title="No se pudo completar la verificación">{error}</Alert>}
    {aviso && <Alert tone="info" title="Verificación">{aviso}</Alert>}

    {estado?.configurado && fase === 'INICIO' && <div className="max-w-xl space-y-3">
      <p className="text-xs leading-relaxed text-brand-600">
        Para proteger las condiciones financieras se requiere confirmar su contraseña actual y
        un código enviado a su correo corporativo verificado antes de configurar o retirar el dispositivo.
      </p>
      {estado.habilitado && <fieldset className="space-y-2 text-sm text-brand-800">
        <legend className="mb-1 font-semibold">Acción de seguridad</legend>
        <label className="flex gap-2 items-center">
          <input type="radio" name="mfa-accion" checked={operacion==='REVOCAR'}
            onChange={()=>setOperacion('REVOCAR')} />
          Retirar autenticador (requiere TOTP y correo)
        </label>
        <label className="flex gap-2 items-center">
          <input type="radio" name="mfa-accion" checked={operacion==='RECUPERAR'}
            onChange={()=>setOperacion('RECUPERAR')} />
          Recuperar acceso (correo + código de respaldo)
        </label>
      </fieldset>}
      <label htmlFor="mfa-password" className="block text-xs font-medium text-brand-700">
        Confirme su contraseña actual
      </label>
      <Input id="mfa-password" type="password" autoComplete="current-password"
        value={password} onChange={e=>setPassword(e.target.value)} maxLength={128} />
      <Button variant="primary" onClick={iniciar} disabled={ocupado || !password}>
        <LockKeyholeIcon className="h-4 w-4" /> Verificar identidad
      </Button>
    </div>}

    {estado?.configurado && fase === 'EMAIL' && <div className="max-w-xl space-y-3">
      <label htmlFor="mfa-email-code" className="block text-xs font-medium text-brand-700">
        Código del correo verificado (6 dígitos)
      </label>
      <Input id="mfa-email-code" inputMode="numeric" pattern="[0-9]{6}"
        autoComplete="one-time-code" maxLength={6} value={emailCode}
        onChange={e=>setEmailCode(e.target.value.replace(/\D/g,'').slice(0,6))}/>
      {operacion==='REVOCAR' && <>
        <label htmlFor="mfa-revoke-code" className="block text-xs font-medium text-brand-700">
          Código de su autenticador
        </label>
        <Input id="mfa-revoke-code" inputMode="numeric" maxLength={6}
          value={totpCode} onChange={e=>setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}/>
      </>}
      {operacion==='RECUPERAR' && <>
        <label htmlFor="mfa-recovery-code" className="block text-xs font-medium text-brand-700">
          Código de recuperación (32 caracteres)
        </label>
        <Input id="mfa-recovery-code" maxLength={32} value={recoveryCode}
          onChange={e=>setRecoveryCode(e.target.value.replace(/[^a-fA-F0-9]/g,'').toUpperCase().slice(0,32))}/>
      </>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={validarEmail} disabled={ocupado ||
          emailCode.length!==6 || (operacion==='REVOCAR' && totpCode.length!==6) ||
          (operacion==='RECUPERAR' && recoveryCode.length!==32)}>
          {operacion==='ENROLAR' ? 'Continuar con autenticador'
            : operacion==='REVOCAR' ? 'Revocar y cerrar sesiones' : 'Recuperar y cerrar sesiones'}
        </Button>
        <Button onClick={()=>setFase('INICIO')} disabled={ocupado}>Cancelar</Button>
      </div>
    </div>}

    {fase==='CONFIGURAR' && <div className="max-w-xl space-y-3">
      <Alert tone="warning" title="Clave mostrada una sola vez">
        Agréguela manualmente a Google Authenticator, Microsoft Authenticator u otra aplicación TOTP.
        No la comparta ni la almacene en el navegador.
      </Alert>
      <p className="break-all rounded-md bg-brand-50 p-3 font-mono text-sm tracking-widest text-brand-900 select-all">
        {secreto}
      </p>
      <p className="text-xs text-brand-500">Emisor: MONOLITHE · 6 dígitos · 30 segundos · SHA-1</p>
      <label htmlFor="mfa-totp-confirm" className="block text-xs font-medium text-brand-700">
        Introduzca los 6 dígitos de la aplicación
      </label>
      <Input id="mfa-totp-confirm" inputMode="numeric" maxLength={6}
        value={totpCode} onChange={e=>setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}/>
      <Button variant="primary" onClick={confirmar} disabled={ocupado||totpCode.length!==6}>
        Confirmar y activar TOTP
      </Button>
    </div>}

    {fase==='RESPALDO' && <div className="max-w-xl space-y-3">
      <Alert tone="warning" title="Guarde los códigos de recuperación">
        Son diez códigos de un único uso. Se mostrarán solo ahora; guárdelos fuera del dispositivo.
        Recuperar el acceso requiere también contraseña y correo verificado.
      </Alert>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {respaldo.map(c=><code key={c} className="rounded-md bg-brand-50 p-2 text-xs tracking-wide text-brand-900">{c}</code>)}
      </div>
      <Button variant="primary" onClick={()=>{
        setRespaldo([]);
        setFase('INICIO');
        void recargar();
      }}>Ya guardé los códigos</Button>
    </div>}
  </section>;
}
