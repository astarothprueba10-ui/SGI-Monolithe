import { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { FieldLabel, Select } from '../../ui/Field';
import { useProjectConfiguration } from '../../../hooks/useProjectConfiguration';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { asignacion, asignar } from '../../../lib/projectConfiguration';

type Props = { projectId: number; tipo: 'manzanas' | 'lotes'; id: number; codigo: string; onClose: () => void };
export function CommercialAssignmentModal({ projectId, tipo, id, codigo, onClose }: Props) {
  const model=useProjectConfiguration(projectId);
  const [valor,setValor]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const {datos,respuesta,publicada}=model;
  const [revision,setRevision]=useState<number|null>(null);
  useEffect(()=>{let vigente=true;if(publicada&&publicada>0)projectConfigurationService.gestion(projectId).then(g=>{if(vigente)setRevision(g.revision);}).catch(e=>{if(vigente)setError(e instanceof Error?e.message:'No se pudo consultar la revisión.');});return()=>{vigente=false;};},[projectId,publicada]);
  const registro=tipo==='lotes'?respuesta?.lotes.find(l=>l.id===id):respuesta?.manzanas.find(m=>m.id===id);
  const lote=tipo==='lotes'?respuesta?.lotes.find(l=>l.id===id):undefined;
  const heredada=lote&&datos?asignacion(datos.manzanas,lote.idManzana):'';
  const actual=datos?asignacion(datos[tipo],id):'';
  const seleccion=valor??actual;
  const protegido=lote && ['VENDIDO','RESERVADO'].includes(lote.estadoInventario??'');
  const permitido=!!datos&&!!registro&&(publicada===0||revision!==null)&&!protegido&&!busy;
  async function guardar() {
    if(!permitido||!datos||seleccion===actual)return;
    setBusy(true);setError('');
    try {
      if(publicada&&publicada>0&&revision!==null) {
        await projectConfigurationService.guardarAsignacion(projectId,revision,tipo,id,seleccion);onClose();return;
      }
      const ok=await model.guardar({...datos,[tipo]:asignar(datos[tipo],id,seleccion)},true);
      if(ok)onClose();else setError('No se pudo guardar la asignación.');
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo guardar la asignación.');}
    finally {setBusy(false);}
  }
  return <Modal open title="Asignación de etapa comercial" onClose={()=>{if(!busy)onClose();}}
    description={codigo} footer={<><Button disabled={busy} onClick={onClose}>Cerrar</Button><Button variant="primary" disabled={!permitido||seleccion===actual||(!!publicada&&tipo==='manzanas'&&!seleccion)} onClick={()=>void guardar()}>Guardar asignación</Button></>}>
    {model.error&&<p role="alert" className="text-sm text-red-700">{model.error}</p>}
    {!datos||publicada===null?<p className="text-sm">Cargando configuración…</p>:!registro?<p className="text-sm">El registro no está activo en el inventario comercial.</p>:<>
      {publicada>0&&<p className="mb-3 text-sm text-brand-700">Se validará la tarifa de destino y se actualizarán los precios y la disponibilidad de los lotes elegibles. Las operaciones protegidas conservan su asignación y precio.</p>}
      {protegido&&<p className="mb-3 text-sm text-brand-700">La operación existente está protegida.</p>}
      <FieldLabel>Etapa comercial</FieldLabel>
      <Select aria-label="Etapa comercial" disabled={!permitido} value={seleccion} onChange={e=>setValor(e.target.value)}>
        <option value="" disabled={!!publicada&&tipo==='manzanas'}>{tipo==='lotes'?`Heredar manzana (${heredada||'sin asignar'})`:'Sin asignar'}</option>
        {datos.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.codigo} — {e.nombre}</option>)}
      </Select>
      {error&&<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </>}
  </Modal>;
}
