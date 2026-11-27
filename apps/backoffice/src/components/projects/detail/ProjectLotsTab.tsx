import {useCallback,useEffect,useState} from 'react';
import {PlusIcon,PencilIcon,History} from 'lucide-react';
import {Card} from '../../ui/Card';
import {Button} from '../../ui/Button';
import {SearchInput,Select} from '../../ui/Field';
import {Table,TD,TH,TR} from '../../ui/Table';
import {Pagination} from '../../ui/Pagination';
import {EmptyState} from '../../ui/Feedback';
import {useAuth} from '../../../contexts/AuthContext';
import {commercialLotService,estadoLote,soles} from '../../../services/commercialLotService';
import type {FilaLote,ListadoLotes} from '../../../services/commercialLotService';
import {CommercialLotFormModal} from '../CommercialLotFormModal';
import {LotStatusModal} from '../LotStatusModal';
import type {ProyectoResponse} from '../../../types/core';
const estados=['DISPONIBLE','NO_DISPONIBLE','BLOQUEADO_COMERCIALMENTE','BLOQUEADO','RESERVADO','VENDIDO'];
const colores:Record<string,string>={DISPONIBLE:'border-emerald-300 bg-emerald-50 text-emerald-700',NO_DISPONIBLE:'border-slate-300 bg-slate-100 text-slate-700',BLOQUEADO_COMERCIALMENTE:'border-amber-200 bg-amber-50 text-amber-800',BLOQUEADO:'border-rose-300 bg-rose-50 text-rose-700',RESERVADO:'border-orange-300 bg-orange-50 text-orange-700',VENDIDO:'border-red-300 bg-red-50 text-red-700'};
export function ProjectLotsTab({project}:{project:ProyectoResponse}){
 const {can,user}=useAuth();const canEdit=can('lots.edit')&&can('projects.edit')&&user.roles.includes('Gerencia');
 const [data,setData]=useState<ListadoLotes|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [search,setSearch]=useState('');const [etapa,setEtapa]=useState('all');const [manzana,setManzana]=useState('all');const [zona,setZona]=useState('all');const [estado,setEstado]=useState('all');const [page,setPage]=useState(1);
 const [modal,setModal]=useState<{fila:FilaLote|null}|null>(null);const [historial,setHistorial]=useState<FilaLote|null>(null);
 const cargar=useCallback(async()=>{setLoading(true);setError('');try{setData(await commercialLotService.listar(project.idProyecto));}catch(e){setData(null);setError(e instanceof Error?e.message:'No se pudieron consultar los lotes.');}finally{setLoading(false);}},[project.idProyecto]);
 useEffect(()=>{void cargar();},[cargar]);
 const bloques=data?.catalogo.manzanas.filter(m=>etapa==='all'||m.codigoEtapa===etapa||data.lotes.some(l=>l.lote.idManzana===m.id&&l.codigoEtapa===etapa))??[];
 const filtrados=(data?.lotes??[]).filter(f=>{const l=f.lote;return (etapa==='all'||f.codigoEtapa===etapa)&&(manzana==='all'||String(l.idManzana)===manzana)&&(zona==='all'||String(l.idZona)===zona)&&(estado==='all'||f.estado===estado)&&(!search.trim()||`${l.codigo} ${l.numero??''} ${l.codigoManzana??''}`.toLowerCase().includes(search.trim().toLowerCase()));});
 const pagina=Math.min(page,Math.max(1,Math.ceil(filtrados.length/12)));
 return <div className="space-y-4">
  {modal&&data&&<CommercialLotFormModal key={modal.fila?.lote.idLote??'nuevo'} project={project} data={data} fila={modal.fila} etapaInicial={etapa} onClose={()=>setModal(null)} onSuccess={setData}/>}
  <LotStatusModal open={!!historial} onClose={()=>setHistorial(null)} lot={historial?.lote??null} comercial={historial} statuses={[]} canEdit={false} onSuccess={cargar}/>
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold text-brand-900">Lotes del proyecto</h3><p className="text-xs text-brand-500">Consulta y gestiona los lotes de {project.nombre}.</p></div>{canEdit&&<Button icon={PlusIcon} disabled={!data?.catalogo.etapas.length||!project.activo} onClick={()=>setModal({fila:null})} className="bg-brand-900 text-white">Nuevo lote</Button>}</div>
  {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error} <Button size="sm" onClick={()=>void cargar()}>Reintentar</Button></p>}
  <Card className="overflow-hidden border border-brand-100 bg-white shadow-card">
   <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 p-4">
    <SearchInput value={search} onValueChange={v=>{setSearch(v);setPage(1);}} placeholder="Buscar lote..." className="w-full sm:w-64"/>
    <Select aria-label="Filtrar etapa comercial" className="sm:w-44" value={etapa} onChange={e=>{setEtapa(e.target.value);setManzana('all');setPage(1);}}><option value="all">Etapas comerciales</option>{data?.catalogo.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select>
    <Select aria-label="Filtrar manzana" className="sm:w-40" value={manzana} onChange={e=>{setManzana(e.target.value);setPage(1);}}><option value="all">Manzanas</option>{bloques.map(m=><option key={m.id} value={String(m.id)}>{m.codigo}</option>)}</Select>
    <Select aria-label="Filtrar zona" className="sm:w-40" value={zona} onChange={e=>{setZona(e.target.value);setPage(1);}}><option value="all">Zonas</option>{data?.catalogo.zonas.map(z=><option key={z.id} value={String(z.id)}>{z.codigo} — {z.nombre}</option>)}</Select>
    <Select aria-label="Filtrar estado" className="sm:w-48" value={estado} onChange={e=>{setEstado(e.target.value);setPage(1);}}><option value="all">Estados</option>{estados.map(s=><option key={s} value={s}>{estadoLote(s)}</option>)}</Select>
   </div>
   {loading?<p className="p-8 text-center text-sm text-brand-600">Cargando lotes…</p>:!filtrados.length?<EmptyState title="No se encontraron lotes." description="Ajusta los filtros o registra un lote."/>:<>
    <Table head={<>{['Lote','Manzana','Etapa comercial','Zona'].map(h=><TH key={h} className="bg-brand-50/80 font-bold">{h}</TH>)}<TH align="right" className="bg-brand-50/80 font-bold">Área</TH><TH align="right" className="bg-brand-50/80 font-bold">Precio</TH><TH className="bg-brand-50/80 font-bold">Estado</TH><TH align="right" className="bg-brand-50/80 font-bold">Acciones</TH></>}>
     {filtrados.slice((pagina-1)*12,pagina*12).map(f=>{const l=f.lote;return <TR key={l.idLote}><TD><strong>{l.numero?'Lote '+l.numero:l.codigo}</strong><p className="text-xs text-brand-500">{l.codigo}</p></TD><TD>{l.codigoManzana??'—'}</TD><TD>{f.nombreEtapa??'Sin asignar'}{f.codigoEtapa&&<p className="text-xs text-brand-500">{f.codigoEtapa}</p>}</TD><TD>{l.nombreZona??'—'}{l.codigoZona&&<p className="text-xs text-brand-500">{l.codigoZona}</p>}</TD><TD align="right">{l.areaM2!=null?l.areaM2+' m²':'—'}</TD><TD align="right">{f.precio==null?'Sin precio':soles(f.precio)}</TD><TD><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colores[f.estado]??'border-slate-200 text-slate-700'}`}>{estadoLote(f.estado)}</span></TD><TD align="right"><div className="flex justify-end gap-2"><Button size="sm" icon={History} onClick={()=>setHistorial(f)}>Historial</Button>{canEdit&&<Button size="sm" icon={PencilIcon} disabled={f.protegido} onClick={()=>setModal({fila:f})}>Editar</Button>}</div></TD></TR>;})}
    </Table><Pagination page={pagina} pageSize={12} total={filtrados.length} onPageChange={setPage}/>
   </>}
  </Card>
 </div>;
}
