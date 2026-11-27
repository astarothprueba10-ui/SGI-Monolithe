import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {ShieldCheckIcon} from 'lucide-react';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {Input,FieldLabel} from '../ui/Field';
import {commercialMfaService,registerCommercialPrompt} from '../../services/commercialMfaService';
import type {CommercialPrompt,CommercialChallenge,CommercialAction} from '../../services/commercialMfaService';
const titulos:Record<CommercialAction,string>={MATRIZ:'Actualizar matriz de tarifas',TARIFA:'Actualizar tarifa',DISPONIBILIDAD:'Modificar disponibilidad comercial',IMPORTACION:'Confirmar carga masiva inicial',PUBLICACION:'Publicar configuración inicial',ETAPAS:'Modificar etapas comerciales',ASIGNACION:'Modificar asignación comercial'};
export function CommercialMfaModal(){
 const location=useLocation();
 const [prompt,setPrompt]=useState<CommercialPrompt|null>(null);
 const current=useRef<CommercialPrompt|null>(null);
 const [challenge,setChallenge]=useState<CommercialChallenge|null>(null);
 const [code,setCode]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [deadline,setDeadline]=useState(0);
 const [resendAt,setResendAt]=useState(0);
 const [now,setNow]=useState(Date.now);
 const restante=Math.max(0,Math.ceil((deadline-now)/1000));
 const espera=Math.max(0,Math.ceil((resendAt-now)/1000));
 function cerrar(){
  const p=current.current;current.current=null;
  p?.reject(new Error('Confirmación cancelada. No se guardaron cambios.'));
  setPrompt(null);setChallenge(null);setCode('');setError('');setBusy(false);
 }
 async function enviar(p:CommercialPrompt){
  setBusy(true);setError('');setCode('');
  try{
   const c=await commercialMfaService.iniciar(p);
   if(current.current!==p)return;
   const t=Date.now();setChallenge(c);setNow(t);setDeadline(t+c.expiraEn*1000);setResendAt(t+c.reenviarEn*1000);
  }catch(e){if(current.current===p)setError(e instanceof Error?e.message:'No se pudo enviar el código.');}
  finally{if(current.current===p)setBusy(false);}
 }
 useEffect(()=>registerCommercialPrompt(p=>{
  current.current=p;setPrompt(p);setChallenge(null);setDeadline(0);setResendAt(0);void enviar(p);
 }),[]);
 useEffect(()=>{if(current.current)cerrar();},[location.pathname]);
 useEffect(()=>()=>{current.current?.reject(new Error('Confirmación cancelada.'));current.current=null;},[]);
 useEffect(()=>{if(!prompt)return;const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id);},[prompt]);
 async function verificar(){
  if(!prompt||!challenge||busy||restante===0||!/^\d{6}$/.test(code))return;
  const p=prompt;setBusy(true);setError('');
  try{
   const r=await commercialMfaService.verificar(p.project,challenge.challengeId,code);
   if(current.current!==p)return;
   current.current=null;setPrompt(null);setCode('');setChallenge(null);p.resolve(r.approvalToken);
  }catch(e){if(current.current===p){setCode('');setError(e instanceof Error?e.message:'No se pudo verificar el código.');}}
  finally{if(current.current===p||current.current===null)setBusy(false);}
 }
 return <Modal open={!!prompt} title="Confirmación de seguridad" description="Protección de información comercial sensible" onClose={cerrar} footer={<><Button onClick={cerrar}>Cancelar</Button><Button variant="primary" disabled={busy||!challenge||restante===0||!/^\d{6}$/.test(code)} onClick={()=>void verificar()}>{busy?'Procesando…':'Verificar y continuar'}</Button></>}>
  <div className="space-y-4">
   <div className="flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-900"><ShieldCheckIcon className="h-6 w-6 shrink-0 text-brand-600"/><div><strong>{prompt&&titulos[prompt.action]}</strong><p>Proyecto #{prompt?.project}. Esta autorización es exclusiva de la operación revisada.</p></div></div>
   {challenge?<><p className="text-sm text-brand-700">Ingresa el código de seis dígitos enviado a <strong>{challenge.correo}</strong>.</p><div><FieldLabel htmlFor="commercial-mfa-code">Código de confirmación</FieldLabel><Input id="commercial-mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy||restante===0} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></div><p className="text-xs text-brand-600">{restante>0?`Vence en ${Math.floor(restante/60)}:${String(restante%60).padStart(2,'0')}`:'Código expirado. Solicita uno nuevo.'}</p></>:<p className="text-sm text-brand-700">{busy?'Enviando código al correo principal verificado…':'Solicita el código para continuar.'}</p>}
   {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   <Button disabled={busy||espera>0||!prompt} onClick={()=>{if(prompt)void enviar(prompt);}}>{espera>0?`Reenviar en ${espera}s`:challenge?'Reenviar código':'Enviar código'}</Button>
   <p className="text-xs text-brand-500">No se guardará ningún cambio hasta verificar el código. Nunca lo compartas.</p>
  </div>
 </Modal>;
}
