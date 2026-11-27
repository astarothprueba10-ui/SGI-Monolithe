import {useState} from 'react';
import {Button} from '../../ui/Button';
import {Input,FieldLabel,Select} from '../../ui/Field';
import {Modal} from '../../ui/Modal';
import {componentesMatriz,totalZona,solesRecargo} from '../../../lib/commercialRecargos';
import type {TarifaComercial,ReglaEtapaComercial,TarifarioComercial,AlcanceMatriz} from '../../../types/projectConfiguration';
type Props={zonas:string[];tarifas:TarifaComercial[];etapas:ReglaEtapaComercial[];tarifario?:TarifarioComercial|null;etapaSeleccionada:string;disabled:boolean;onSave:(base:number,recargos:Record<string,number>,desde:string,hasta:string|null,alcance:AlcanceMatriz,codigo:string|null)=>Promise<void>};
const hoy=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function CommercialMatrixRecargos({zonas,tarifas,etapas,tarifario,etapaSeleccionada,disabled,onSave}:Props){
 const partes=componentesMatriz(zonas)??[];
 const [open,setOpen]=useState(false);
 const [confirmar,setConfirmar]=useState(false);
 const [alcance,setAlcance]=useState<AlcanceMatriz>('GENERAL');
 const [codigo,setCodigo]=useState('');
 const [base,setBase]=useState('');
 const [recargos,setRecargos]=useState<Record<string,string>>({});
 const [desde,setDesde]=useState(hoy);
 const [hasta,setHasta]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const propias=tarifario?.personalizadas??[];
 const general=tarifario?.general;
 const destinos=alcance==='GENERAL'?etapas.filter(e=>!propias.includes(e.codigo)):etapas.filter(e=>e.codigo===codigo);
 const r=Object.fromEntries(partes.map(k=>[k,Number(recargos[k])]));
 const valido=base.trim()!==''&&Number.isFinite(Number(base))&&Number(base)>0&&partes.every(k=>!!recargos[k]?.trim()&&Number.isFinite(r[k])&&r[k]>=0)&&!!desde&&desde<=hoy()&&(!hasta||hasta>=hoy()&&hasta>=desde)&&(alcance==='GENERAL'||destinos.length===1);
 function cargar(a:AlcanceMatriz,c:string){
  setAlcance(a);setCodigo(c);setConfirmar(false);setError('');
  const ts=tarifas.filter(t=>t.codigoEtapa===c&&t.moneda==='PEN'&&t.tipoTarifa==='MONTO_FIJO');
  const d=ts.find(t=>t.codigoZona==='D');
  const usarGeneral=a==='GENERAL'||a==='HEREDAR';
  const g=usarGeneral?general:!d?general:null;
  const b=g?.precioBase??(!usarGeneral?d?.valor:undefined);
  setBase(b==null?'':String(b));setRecargos(Object.fromEntries(partes.map(k=>{const t=ts.find(t=>t.codigoZona===k);const v=g?.recargos[k]??(!usarGeneral&&t&&d?t.valor-d.valor:undefined);return [k,v==null?'':String(v)];})));
  setDesde(g?.vigenteDesde??(!usarGeneral?d?.vigenteDesde:undefined)??hoy());setHasta(g?.vigenteHasta??(!usarGeneral?d?.vigenteHasta:undefined)??'');
 }
 function abrir(){cargar('GENERAL',etapaSeleccionada||etapas[0]?.codigo||'');setOpen(true);}
 async function guardar(){
  if(!valido||busy||disabled)return;
  setBusy(true);setError('');
  try{await onSave(Number(base),r,desde,hasta||null,alcance,alcance==='GENERAL'?null:codigo);setOpen(false);setConfirmar(false);}
  catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la matriz.');setConfirmar(false);}
  finally{setBusy(false);}
 }
 return <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-brand-900">Tarifario general y por etapa</p><p className="text-xs text-brand-600">{general?solesRecargo(general.precioBase)+' de base general':'Matriz general aún no definida'} · {propias.length} etapas independientes. Los cambios generales respetan las excepciones.</p></div><Button variant="primary" disabled={disabled||busy} onClick={abrir}>Configurar matriz de recargos</Button></div>
  <Modal open={open} title={confirmar?'Confirmar matriz de recargos':'Configurar matriz de recargos'} onClose={()=>{if(!busy)setOpen(false);}} footer={<><Button disabled={busy} onClick={()=>confirmar?setConfirmar(false):setOpen(false)}>{confirmar?'Volver':'Cancelar'}</Button><Button variant="primary" disabled={!valido||busy||disabled} onClick={()=>confirmar?void guardar():setConfirmar(true)}>{busy?'Guardando…':confirmar?'Confirmar y guardar':'Revisar matriz'}</Button></>}>
  {!confirmar?<fieldset disabled={busy} className="space-y-3">
    <FieldLabel htmlFor="matriz-alcance">Aplicar configuración a</FieldLabel><Select id="matriz-alcance" value={alcance} onChange={e=>cargar(e.target.value as AlcanceMatriz,codigo)}><option value="GENERAL">Matriz general del proyecto</option><option value="ETAPA">Etapa comercial específica</option><option value="HEREDAR" disabled={!general||!propias.length}>Restablecer matriz general en una etapa</option></Select>
    {alcance!=='GENERAL'&&<><FieldLabel htmlFor="matriz-etapa">Etapa comercial</FieldLabel><Select id="matriz-etapa" value={codigo} onChange={e=>cargar(alcance,e.target.value)}>{etapas.map(e=><option key={e.codigo} value={e.codigo} disabled={alcance==='HEREDAR'&&!propias.includes(e.codigo)}>{e.nombre} · {propias.includes(e.codigo)?'Personalizada':'General'}</option>)}</Select></>}
    <p className="text-xs text-brand-600">{alcance==='GENERAL'?'Solo se actualizan etapas sin excepción. Los tarifarios anteriores no uniformes se conservan como independientes.':alcance==='HEREDAR'?'La etapa volverá a utilizar los precios generales.':'El cambio no modifica otras etapas.'}</p>
    <FieldLabel>Precio base por lote (D) — PEN</FieldLabel><Input disabled={alcance==='HEREDAR'} type="number" min="0.01" step="0.01" placeholder="Precio base" value={base} onChange={e=>setBase(e.target.value)}/>
    <div className="grid grid-cols-2 gap-3">{partes.map(k=><div key={k}><FieldLabel>Recargo de {k} — PEN</FieldLabel><Input disabled={alcance==='HEREDAR'} aria-label={'Recargo '+k} type="number" min="0" step="0.01" placeholder="Ingresar monto" value={recargos[k]??''} onChange={e=>setRecargos(p=>({...p,[k]:e.target.value}))}/></div>)}</div>
    <div className="grid grid-cols-2 gap-3"><div><FieldLabel>Vigente desde</FieldLabel><Input disabled={alcance==='HEREDAR'} type="date" value={desde} max={hoy()} onChange={e=>setDesde(e.target.value)}/></div><div><FieldLabel>Vigente hasta (opcional)</FieldLabel><Input disabled={alcance==='HEREDAR'} type="date" value={hasta} min={hoy()} onChange={e=>setHasta(e.target.value)}/></div></div>
  </fieldset>:<div className="space-y-3 text-sm"><p><strong>{alcance==='GENERAL'?'Matriz general':alcance==='HEREDAR'?'Restablecer herencia':'Matriz personalizada'}</strong> · {destinos.length} etapas afectadas: {destinos.map(e=>e.nombre).join(', ')||'ninguna; solo se guardará la matriz general'}.</p><p>Las ventas, reservas y disponibilidad se mantienen. Los descuentos siguen siendo individuales por etapa.</p><table className="w-full text-left"><thead><tr><th>Zona</th><th>Adicional</th><th>Precio de lista</th></tr></thead><tbody>{zonas.map(z=><tr key={z}><td>{z}</td><td>{solesRecargo(totalZona(z,Number(base),r)-Number(base))}</td><td>{solesRecargo(totalZona(z,Number(base),r))}</td></tr>)}</tbody></table></div>}
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </Modal>
 </div>;
}
