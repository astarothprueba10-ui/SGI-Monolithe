import {useCallback,useEffect,useState} from 'react';
import {LayoutGridIcon,PlusIcon,PencilIcon,FilterIcon} from 'lucide-react';
import {Card} from '../../ui/Card';
import {Button} from '../../ui/Button';
import {Select,FieldLabel,SearchInput} from '../../ui/Field';
import {Dropdown,DropdownItem} from '../../ui/Dropdown';
import {Table,TD,TH,TR} from '../../ui/Table';
import {StatusBadge} from '../../ui/Badge';
import {EmptyState} from '../../ui/Feedback';
import {useAuth} from '../../../contexts/AuthContext';
import {commercialBlockService,etiquetasManzana} from '../../../services/commercialBlockService';
import type {ListadoManzanas,ManzanaComercial,EstadoManzana} from '../../../services/commercialBlockService';
import {CommercialBlockFormModal} from '../CommercialBlockFormModal';
import type {ProyectoResponse} from '../../../types/core';
const filtros=[['TODOS','Todos'],['ACTIVA','Activas'],['INACTIVA','Inactivas'],['BLOQUEADA_COMERCIALMENTE','Bloqueadas comercialmente'],['VENDIDA','Vendidas']] as const;
const colores:Record<EstadoManzana,string>={ACTIVA:'border-emerald-200 bg-emerald-50 text-emerald-700',INACTIVA:'border-slate-200 bg-slate-100 text-slate-600',BLOQUEADA_COMERCIALMENTE:'border-amber-200 bg-amber-50 text-amber-800',VENDIDA:'border-brand-200 bg-brand-100 text-brand-800'};
export function ProjectBlocksTab({project}:{project:ProyectoResponse}){
 const {can,user}=useAuth();
 const canEdit=can('projects.edit')&&can('lots.edit')&&user.roles.includes('Gerencia');
 const [data,setData]=useState<ListadoManzanas|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [etapa,setEtapa]=useState('');
 const [search,setSearch]=useState('');
 const [filtro,setFiltro]=useState<EstadoManzana|'TODOS'>('TODOS');
 const [modal,setModal]=useState<{block:ManzanaComercial|null}|null>(null);
 const load=useCallback(async()=>{
   setLoading(true);setError('');
   try{const r=await commercialBlockService.listar(project.idProyecto);setData(r);}
   catch(e){setData(null);setError(e instanceof Error?e.message:'No se pudieron consultar las manzanas.');}
   finally{setLoading(false);}
 },[project.idProyecto]);
 useEffect(()=>{setEtapa('');void load();},[load]);
 const filas=(data?.manzanas??[]).filter(m=>(!etapa||m.codigoEtapa===etapa)&&(filtro==='TODOS'||m.estado===filtro)&&(!search.trim()||`${m.codigo} ${m.nombre??''}`.toLowerCase().includes(search.trim().toLowerCase())));
 return <div className="space-y-5">
   {modal&&data&&<CommercialBlockFormModal key={modal.block?.id??'nueva'} project={project} listado={data} block={modal.block} etapaInicial={etapa} onClose={()=>setModal(null)} onSuccess={setData}/>}
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-base font-semibold text-brand-900"><LayoutGridIcon className="h-5 w-5 text-brand-600"/>Manzanas del proyecto</h3><p className="mt-0.5 text-xs text-brand-500">Organiza las manzanas de {project.nombre} por etapa comercial y zonas.</p></div>{canEdit&&data&&<Button icon={PlusIcon} disabled={!data.etapas.length||!data.zonas.some(z=>z.activa)} onClick={()=>setModal({block:null})} className="bg-brand-900 text-white hover:bg-brand-800 border border-[#4cbb17]/40">Nueva manzana</Button>}</div>
   {error&&<div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <Button size="sm" onClick={()=>void load()}>Reintentar</Button></div>}
   {data&&<>
    <Card className="flex flex-wrap items-end justify-start gap-3 border border-brand-100 bg-white p-4 shadow-card">
     <SearchInput value={search} onValueChange={setSearch} placeholder="Buscar manzana..." className="w-full sm:w-64"/>
     <div className="flex w-full flex-col sm:w-auto"><FieldLabel htmlFor="etapa-comercial-manzanas">Etapa comercial</FieldLabel><Select id="etapa-comercial-manzanas" value={etapa} onChange={e=>setEtapa(e.target.value)} className="sm:min-w-44"><option value="">Todas las etapas</option>{data.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select></div>
     <Dropdown align="left" width="w-64" trigger={({open,toggle})=><button type="button" aria-expanded={open} aria-label="Filtrar manzanas por estado" onClick={toggle} className={`inline-flex h-11 sm:h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${filtro==='TODOS'?'border-brand-200 bg-white text-brand-700':colores[filtro]}`}><FilterIcon className="h-4 w-4"/>{filtros.find(f=>f[0]===filtro)?.[1]}</button>}>{({close})=><>{filtros.map(([id,label])=><DropdownItem key={id} onClick={()=>{setFiltro(id);close();}}><span className={id===filtro?'font-semibold':''}>{label}</span></DropdownItem>)}</>}</Dropdown>
    </Card>
    {!data.etapas.length&&<p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Registra primero una etapa comercial para crear o asignar manzanas.</p>}
    {!data.publicado&&<p className="text-xs text-brand-500">La disponibilidad comercial se aplicará al finalizar la configuración inicial.</p>}
    <Card className="overflow-hidden border border-brand-100 bg-white shadow-card">
     {loading?<p className="p-8 text-center text-sm text-brand-600">Cargando manzanas...</p>:!filas.length?<EmptyState title="No se encontraron manzanas." description="Cambia los filtros o registra una manzana."/>:<Table head={<>{['Orden','Código','Nombre','Etapa comercial','Zonas asociadas'].map(t=><TH key={t} className="bg-brand-50/80 font-bold text-brand-900">{t}</TH>)}<TH align="center" className="bg-brand-50/80 font-bold">Lotes asociados</TH><TH className="bg-brand-50/80 font-bold">Estado</TH>{canEdit&&<TH align="right" className="bg-brand-50/80 font-bold">Acciones</TH>}</>}>
      {filas.map(m=><TR key={m.id}><TD>{String(m.orden).padStart(2,'0')}</TD><TD><span className="rounded border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-medium">{m.codigo}</span></TD><TD>{m.nombre??'—'}</TD><TD>{m.nombreEtapa??'Sin asignar'}{m.codigoEtapa&&<div className="text-xs text-brand-500">{m.codigoEtapa}</div>}</TD><TD><div className="flex flex-wrap gap-1">{m.zonas.length?m.zonas.map(z=><span key={z.id} title={z.nombre} className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-xs">{z.codigo}</span>):'—'}</div></TD><TD align="center">{m.lotes}</TD><TD><StatusBadge status={etiquetasManzana[m.estado]} className={colores[m.estado]}/></TD>{canEdit&&<TD align="right"><Button size="sm" icon={PencilIcon} onClick={()=>setModal({block:m})}>Editar</Button></TD>}</TR>)}
     </Table>}
    </Card>
   </>}
   {loading&&!data&&<p className="p-8 text-center text-sm text-brand-600">Cargando manzanas...</p>}
 </div>;
}
