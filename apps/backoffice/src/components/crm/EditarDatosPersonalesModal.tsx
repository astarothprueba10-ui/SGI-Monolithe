import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ClipboardCheck,ShieldCheck,UserRoundPen} from 'lucide-react';
import {toast} from 'sonner';
import {Modal} from '../ui/Modal';
import {Button} from '../ui/Button';
import {Input,Select} from '../ui/Field';
import {crmBackend,type CrmDatosPersonalesEdicion,type CrmDatosPersonales} from '../../services/crmBackend';
import {normalizarDatoPersonal,validarDatosPersonales,type CampoPersonal} from '../../utils/crmDatosPersonalesValidation';

type Props={idProspecto:number|null;codigo?:string;onClose:()=>void;onSaved:()=>void|Promise<void>};
const VACIO:CrmDatosPersonalesEdicion={
 nombres:'',apellidoPaterno:'',apellidoMaterno:'',telefono:'',correo:'',
 tipoDocumento:'DNI',numeroDocumento:'',direccion:''
};
export function EditarDatosPersonalesModal({idProspecto,codigo,onClose,onSaved}:Props){
 const [form,setForm]=useState<CrmDatosPersonalesEdicion>(VACIO);
 const [original,setOriginal]=useState<CrmDatosPersonales|null>(null);
 const [motivo,setMotivo]=useState('');
 const [cargando,setCargando]=useState(false);
 const [guardando,setGuardando]=useState(false);
 const [intentado,setIntentado]=useState(false);
 const [visitados,setVisitados]=useState<Partial<Record<CampoPersonal,boolean>>>({});
 const errores=useMemo(()=>validarDatosPersonales(form),[form]);
 useEffect(()=>{
   if(!idProspecto) return;
   let vigente=true;
   setCargando(true);setOriginal(null);setIntentado(false);
   setVisitados({});setMotivo('');
   void crmBackend.datosPersonales(idProspecto).then(d=>{
     if(!vigente)return;
     setOriginal(d);
     setForm({
       nombres:d.nombres??'',apellidoPaterno:d.apellidoPaterno??'',
       apellidoMaterno:d.apellidoMaterno??'',telefono:d.telefono??'',
       correo:d.correo??'',tipoDocumento:d.tipoDocumento??'DNI',
       numeroDocumento:d.numeroDocumento??'',direccion:d.direccion??''
     });
   }).catch(e=>{
      if(vigente){toast.error('No se pudo consultar la ficha personal',
       {description:e instanceof Error?e.message:'Error de conexión.'});onClose();}
   }).finally(()=>{if(vigente)setCargando(false);});
   return ()=>{vigente=false;};
 },[idProspecto]);
 const actualizar=(campo:CampoPersonal,v:string)=>{
   if(campo==='tipoDocumento'){
     setForm(prev=>({...prev,tipoDocumento:v as CrmDatosPersonalesEdicion['tipoDocumento'],numeroDocumento:''}));
   }else {
     setForm(prev=>({...prev,[campo]:normalizarDatoPersonal(campo,v,prev.tipoDocumento)}));
   }
 };
 const cambiar=(campo:CampoPersonal,label:string,extra?:{optional?:boolean;type?:string;max?:number})=>{
   const error=(intentado||visitados[campo])?errores[campo]:undefined;
   return <div className="min-w-0">
     <label className="mb-1.5 block text-xs font-semibold text-brand-700">{label}{extra?.optional?'':' *'}</label>
     <Input type={extra?.type??'text'} value={form[campo]}
       maxLength={extra?.max??255} required={!extra?.optional}
       disabled={cargando||guardando||(original?.documentoVerificado===true && campo==='numeroDocumento')}
       onChange={e=>actualizar(campo,e.target.value)}
       onBlur={()=>setVisitados(p=>({...p,[campo]:true}))}
       aria-invalid={!!error}
       className={error?'border-red-500':''}/>
     {error&&<p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
   </div>;
 };
 const guardar=async()=>{
   if(!idProspecto||!original||guardando) return;
   setIntentado(true);
   if(Object.keys(errores).length){toast.error('Corrige los campos marcados antes de guardar.');return;}
   if(motivo.trim().length<8){toast.error('Explica brevemente el motivo de la corrección (mínimo 8 caracteres).');return;}
   const cambio=Object.entries(form).some(([k,v])=>
     String(v).trim()!==String(original[k as keyof CrmDatosPersonales]??'').trim());
   if(!cambio){toast.info('No hay cambios en los datos personales.');return;}
   setGuardando(true);
   try{
     await crmBackend.corregirDatosPersonales(idProspecto,{
       ...form,correo:form.correo.trim().toLowerCase(),
       numeroDocumento:form.numeroDocumento.trim().toUpperCase()
     },motivo.trim());
     toast.success('Datos personales corregidos',{description:'La modificación quedó registrada en el historial del expediente.'});
     onClose();
     await onSaved();
   }catch(e:unknown){
     toast.error('No se pudieron actualizar los datos',
       {description:e instanceof Error?e.message:'Revisa los valores y permisos.'});
   }finally{setGuardando(false);}
 };
 return <Modal open={idProspecto!==null} onClose={onClose} width="max-w-2xl"
   title="Editar datos personales"
   description={`Corrección de identidad y contacto de ${codigo??'prospecto'}`}
   footer={<div className="flex justify-end gap-2">
     <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
     <Button variant="primary" onClick={()=>void guardar()}
       disabled={guardando||cargando||!original}>
       {guardando?'Guardando…':'Guardar cambios'}
     </Button>
   </div>}>
   {cargando||!original?
     <p className="py-8 text-center text-sm text-brand-500">Consultando los datos del prospecto…</p>:
     <div className="space-y-4">
       <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
         <UserRoundPen className="mt-0.5 h-5 w-5 shrink-0 text-blue-700"/>
         <div>
           <p className="text-xs font-bold text-blue-900">Corrección de datos captados</p>
           <p className="mt-1 text-xs leading-relaxed text-blue-800">
             Comprueba los datos originales. Se conservarán el usuario, la fecha y los valores anteriores en el historial.
           </p>
         </div>
       </div>
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
         {cambiar('nombres','Nombres',{max:120})}
         {cambiar('apellidoPaterno','Apellido paterno',{max:80})}
         {cambiar('apellidoMaterno','Apellido materno',{optional:true,max:80})}
         {cambiar('telefono','Teléfono / WhatsApp',{max:18})}
         <div className="sm:col-span-2">{cambiar('correo','Correo electrónico',{type:'email',max:180})}</div>
         <div>
           <label className="mb-1.5 block text-xs font-semibold text-brand-700">Tipo de documento *</label>
           <Select value={form.tipoDocumento} disabled={original.documentoVerificado||guardando}
             onChange={e=>actualizar('tipoDocumento',e.target.value)}>
             <option value="DNI">DNI</option>
             <option value="CE">Carné de extranjería</option>
             <option value="PASAPORTE">Pasaporte</option>
             <option value="RUC">RUC</option>
           </Select>
         </div>
         {cambiar('numeroDocumento','Número de documento',{max:form.tipoDocumento==='DNI'?8:form.tipoDocumento==='RUC'?11:form.tipoDocumento==='CE'?12:20})}
         {original.documentoVerificado&&<p className="flex items-center gap-1 text-xs text-amber-700 sm:col-span-2">
           <ShieldCheck className="h-4 w-4"/>El documento verificado solo se cambia mediante un proceso de identidad autorizado.
         </p>}
         <div className="sm:col-span-2">{cambiar('direccion','Dirección de domicilio',{optional:true,max:255})}</div>
       </div>
       <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
         <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-brand-800">
           <ClipboardCheck className="h-4 w-4 text-amber-700"/>Motivo de la corrección *
         </label>
         <textarea value={motivo} rows={2} maxLength={500}
           disabled={guardando} onChange={e=>setMotivo(e.target.value)}
           placeholder="Ej.: El cliente corrigió un dígito de su documento por WhatsApp."
           className="w-full resize-y rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
           aria-invalid={intentado&&motivo.trim().length<8}/>
         {intentado&&motivo.trim().length<8&&
           <p className="mt-1 text-xs text-red-600">Indica al menos 8 caracteres para justificar el cambio.</p>}
       </div>
       <p className="flex gap-2 text-[11px] text-brand-500">
         <AlertTriangle className="h-4 w-4 shrink-0"/>
         No modifica automáticamente contratos firmados ni permite sustituir un documento de identidad verificado.
       </p>
     </div>}
 </Modal>;
}
