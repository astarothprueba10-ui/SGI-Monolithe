import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import type { ConfiguracionProyectoResponse, PublicacionComercialResponse } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

type Props = { project: ProyectoResponse; config: ConfiguracionProyectoResponse; dirty: boolean };
const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const importe = (v: number | null) => v === null ? '—' : moneda.format(v);
const etiquetas = { HABILITADA: 'Habilitada', BLOQUEADA: 'Bloqueada', PROTEGIDA: 'Protegida', ERROR: 'Error' };

function Resumen({ r }: { r: PublicacionComercialResponse }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {(['HABILITADA','BLOQUEADA','PROTEGIDA','ERROR'] as const).map(s =>
        <div key={s} className="rounded-md border border-brand-100 p-3">
          <p className="text-xs text-brand-500">{etiquetas[s]}</p>
          <p className={`text-xl font-semibold ${s==='ERROR'?'text-red-700':'text-brand-900'}`}>{r.lotes.filter(l=>l.situacion===s).length}</p>
        </div>)}
    </div>
    <div className="max-h-96 overflow-auto rounded-md border border-brand-200">
      <table className="w-full text-xs text-left">
        <thead className="sticky top-0 bg-brand-50 text-brand-900"><tr>
          {['Lote','Inventario','Etapa comercial','Política','Precio actual','Precio final','Descuento','Detalle'].map(h=><th key={h} className="p-2">{h}</th>)}
        </tr></thead>
        <tbody>{r.lotes.map(l=><tr key={l.idLote} className="border-t border-brand-100">
          <td className="p-2 font-medium">{l.codigo}</td><td className="p-2">{l.estadoInventario}</td>
          <td className="p-2">{l.codigoEtapa??'—'}</td><td className={`p-2 font-medium ${l.situacion==='ERROR'?'text-red-700':''}`}>{etiquetas[l.situacion]}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioActual)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.precioFinal)}</td>
          <td className="p-2 whitespace-nowrap">{importe(l.descuento)}</td>
          <td className="p-2">{l.mensaje}{l.habilitarInventario?' Pasará a Disponible.':''}{l.vigenteHasta?` Vigente hasta ${l.vigenteHasta}.`:''}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function CommercialPublicationPanel({ project, config, dirty }: Props) {
  const { can } = useAuth();
  const [publicada,setPublicada] = useState<number|null>(null);
  const [habilitar,setHabilitar] = useState(false);
  const [resultado,setResultado] = useState<PublicacionComercialResponse|null>(null);
  const [ocupado,setOcupado] = useState(false);
  const [aceptado,setAceptado] = useState(false);
  const [error,setError] = useState('');
  const [intento,setIntento] = useState(0);
  const puede = can('lots.edit') && project.activo && !dirty && publicada!==null && config.version>publicada && !ocupado;

  useEffect(()=>{
    let activo=true;
    setPublicada(null);
    projectConfigurationService.versionPublicada(project.idProyecto)
      .then(r=>{if(activo)setPublicada(r.version);})
      .catch((e:unknown)=>{if(activo)setError(e instanceof Error?e.message:'No se pudo consultar la publicación.');});
    return ()=>{activo=false;};
  },[project.idProyecto,intento]);

  async function revisar() {
    if(!puede)return;
    setOcupado(true);setError('');setResultado(null);setAceptado(false);
    try{setResultado(await projectConfigurationService.revisarPublicacion(project.idProyecto,config.version,habilitar));}
    catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo revisar.');}
    finally{setOcupado(false);}
  }

  async function publicar() {
    if(!puede||!aceptado||!resultado||resultado.publicado||resultado.lotes.some(l=>l.situacion==='ERROR'))return;
    setOcupado(true);setError('');
    try{
      const r=await projectConfigurationService.publicar(project.idProyecto,config.version,habilitar,resultado.huella);
      setResultado(r);setPublicada(r.versionPublicada);
    }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo publicar.');setResultado(null);}
    finally{setOcupado(false);setAceptado(false);}
  }

  return <section className="rounded-lg border border-brand-200 p-4 space-y-3">
    <h3 className="font-semibold text-brand-900">Publicación de política comercial</h3>
    <p className="text-sm text-brand-600">{publicada===null?'Consultando política publicada…':publicada>0?`Política vigente v${publicada}`:'Sin política publicada; se conserva el funcionamiento anterior.'}</p>
    <p className="text-xs text-brand-500">Publicar sincroniza los precios oficiales en PEN y activa las restricciones comerciales. Conserva las reservas y ventas existentes y los bloqueos manuales.</p>
    {dirty&&<p className="text-sm text-amber-800">Guarda tus cambios antes de revisar la publicación.</p>}
    {error&&<div role="alert" className="text-sm text-red-700">{error}{publicada===null&&<Button size="sm" onClick={()=>{setError('');setIntento(n=>n+1);}}>Reintentar</Button>}</div>}
    <label className="flex gap-2 text-sm items-start text-brand-800">
      <input type="checkbox" checked={habilitar} disabled={!puede} onChange={e=>{setHabilitar(e.target.checked);setResultado(null);setAceptado(false);}}/>
      Habilitar también los lotes en estado No disponible que tengan precio válido y etapa comercial abierta.
    </label>
    <Button disabled={!puede} icon={ShieldCheckIcon} onClick={revisar}>{ocupado?'Procesando…':'Revisar publicación'}</Button>
    {resultado&&!dirty&&<><Resumen r={resultado}/>
      {resultado.publicado?<p role="status" className="text-sm text-emerald-700">Política v{resultado.version} publicada. Los precios y restricciones ya están vigentes.</p>:
      <><label className="flex gap-2 text-sm items-start text-brand-800">
        <input type="checkbox" checked={aceptado} disabled={!puede||resultado.lotes.some(l=>l.situacion==='ERROR')} onChange={e=>setAceptado(e.target.checked)}/>
        Confirmo aplicar los precios y restricciones revisados. Las separaciones y ventas previas se respetarán.
      </label><Button variant="primary" disabled={!puede||!aceptado||resultado.lotes.some(l=>l.situacion==='ERROR')} onClick={publicar}>Publicar política comercial</Button></>}
    </>}
  </section>;
}
