import {useState} from 'react';
import {Button} from '../../ui/Button';
import {Input,FieldLabel} from '../../ui/Field';
import {Modal} from '../../ui/Modal';
import {componentesMatriz,totalZona,solesRecargo} from '../../../lib/commercialRecargos';
import type {TarifaComercial,ReglaEtapaComercial} from '../../../types/projectConfiguration';
type Props={zonas:string[];tarifas:TarifaComercial[];etapas:ReglaEtapaComercial[];disabled:boolean;onSave:(base:number,recargos:Record<string,number>,desde:string,hasta:string|null)=>Promise<void>};
const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function CommercialMatrixRecargos({zonas,tarifas,etapas,disabled,onSave}:Props){
 const partes=componentesMatriz(zonas)??[];
 const [open,setOpen]=useState(false);
 const [confirmar,setConfirmar]=useState(false);
 const [base,setBase]=useState('');
 const [recargos,setRecargos]=useState<Record<string,string>>({});
 const [desde,setDesde]=useState(hoy);
 const [hasta,setHasta]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const r=Object.fromEntries(partes.map(k=>[k,Number(recargos[k])]));
 const valido=base.trim()!==''&&Number.isFinite(Number(base))&&Number(base)>0&&partes.every(k=>!!recargos[k]?.trim()&&Number.isFinite(r[k])&&r[k]>=0)&&!!desde&&desde<=hoy()&&(!hasta||hasta>=hoy()&&hasta>=desde);
 function abrir(){
  const bs=tarifas.filter(t=>t.codigoZona==='D'&&t.moneda==='PEN'&&t.tipoTarifa==='MONTO_FIJO'&&t.vigenteDesde<=hoy()&&(!t.vigenteHasta||t.vigenteHasta>=hoy()));
  const unica=bs.length&&bs.every(t=>t.valor===bs[0].valor)?bs[0].valor:null;
  setBase(unica===null?'':String(unica));setRecargos({});setDesde(hoy());setHasta('');setError('');setConfirmar(false);setOpen(true);
 }
 async function guardar(){
  if(!valido||busy||disabled)return;
  setBusy(true);setError('');
  try{await onSave(Number(base),r,desde,hasta||null);setOpen(false);setConfirmar(false);}
  catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la matriz.');setConfirmar(false);}
  finally{setBusy(false);}
 }
 return <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-brand-900">Tarifario común por ubicación</p><p className="text-xs text-brand-600">Define el precio base y cada recargo simple una sola vez. El sistema suma las combinaciones y aplica los descuentos propios de cada etapa.</p></div><Button variant="primary" disabled={disabled||busy} onClick={abrir}>Configurar matriz de recargos</Button></div>
  <Modal open={open} title={confirmar?'Confirmar matriz de recargos':'Configurar matriz de recargos'} onClose={()=>{if(!busy)setOpen(false);}} footer={<><Button disabled={busy} onClick={()=>confirmar?setConfirmar(false):setOpen(false)}>{confirmar?'Volver':'Cancelar'}</Button><Button variant="primary" disabled={!valido||busy||disabled} onClick={()=>confirmar?void guardar():setConfirmar(true)}>{busy?'Guardando…':confirmar?'Confirmar y guardar':'Revisar matriz'}</Button></>}>
  {!confirmar?<fieldset disabled={busy} className="space-y-3">
    <p className="text-xs text-brand-600">Los recargos deben ingresarse manualmente. No se deducen de las tarifas antiguas ni de sus descripciones.</p>
    <FieldLabel>Precio base por lote (D) — PEN</FieldLabel><Input type="number" min="0.01" step="0.01" placeholder="Precio base" value={base} onChange={e=>setBase(e.target.value)}/>
    <div className="grid grid-cols-2 gap-3">{partes.map(k=><div key={k}><FieldLabel>Recargo de {k} — PEN</FieldLabel><Input aria-label={'Recargo '+k} type="number" min="0" step="0.01" placeholder="Ingresar monto" value={recargos[k]??''} onChange={e=>setRecargos(p=>({...p,[k]:e.target.value}))}/></div>)}</div>
    <div className="grid grid-cols-2 gap-3"><div><FieldLabel>Vigente desde</FieldLabel><Input type="date" value={desde} max={hoy()} onChange={e=>setDesde(e.target.value)}/></div><div><FieldLabel>Vigente hasta (opcional)</FieldLabel><Input type="date" value={hasta} min={hoy()} onChange={e=>setHasta(e.target.value)}/></div></div>
  </fieldset>:<div className="space-y-3 text-sm"><p>Se sustituirán las tarifas PEN de todas las zonas activas en las {etapas.length} etapas. Las ventas, reservas y disponibilidad se mantienen. Las condiciones promocionales siguen siendo individuales por etapa.</p><table className="w-full text-left"><thead><tr><th>Zona</th><th>Adicional</th><th>Precio de lista</th></tr></thead><tbody>{zonas.map(z=><tr key={z}><td>{z}</td><td>{solesRecargo(totalZona(z,Number(base),r)-Number(base))}</td><td>{solesRecargo(totalZona(z,Number(base),r))}</td></tr>)}</tbody></table></div>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </Modal>
 </div>;
}
