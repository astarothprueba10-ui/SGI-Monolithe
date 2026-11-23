import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LayersIcon, PlusIcon, RefreshCwIcon, Link2Icon, FolderOpenIcon, ShoppingCartIcon } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Alert, EmptyState } from '../ui/Feedback';
import { Table, TD, TH, TR } from '../ui/Table';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
  crmBackend, type CrmProspect, type CrmOperacionAgrupada,
  type CrmOperacionesAgrupadasPage, type CrmOperacionAgrupadaLote,
  type CrmOperacionItem,
} from '../../services/crmBackend';
import { coreService } from '../../services/coreService';
import type { ProyectoResponse, EtapaResponse, LoteResponse } from '../../types/core';
import { currency } from '../../utils/format';

type Modalidad='CONTADO'|'FINANCIADA';
type ItemDraft={
  idLote:number;codigoLote:string;idProyecto:number;idEtapa:number;
  proyecto:string;modalidad:Modalidad;
};
type Preseleccion={
  idOperacion:number;idProspecto:number;idLote:number;idProyecto:number;idEtapa:number;
  modalidad:Modalidad;
};

const fecha=(v:string)=>new Date(v).toLocaleDateString('es-PE',{timeZone:'America/Lima'});
const msg=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la consulta.';

export function OperacionesAgrupadasPanel({onPrepararVenta}:{
  onPrepararVenta:(datos:Preseleccion)=>void
}){
  const {can}=useAuth();
  const [prospectos,setProspectos]=useState<CrmProspect[]>([]);
  const [proyectos,setProyectos]=useState<ProyectoResponse[]>([]);
  const [etapas,setEtapas]=useState<EtapaResponse[]>([]);
  const [lotes,setLotes]=useState<LoteResponse[]>([]);
  const [idProspecto,setIdProspecto]=useState('');
  const [idProyecto,setIdProyecto]=useState('');
  const [idEtapa,setIdEtapa]=useState('');
  const [idLote,setIdLote]=useState('');
  const [modalidad,setModalidad]=useState<Modalidad>('CONTADO');
  const [items,setItems]=useState<ItemDraft[]>([]);
  const [observaciones,setObservaciones]=useState('');
  const [proyectosElegibles,setProyectosElegibles]=useState<number[]>([]);
  const [consultandoLotes,setConsultandoLotes]=useState(false);
  const [guardando,setGuardando]=useState(false);
  const [cargando,setCargando]=useState(true);
  const [listado,setListado]=useState<CrmOperacionesAgrupadasPage|null>(null);
  const [pagina,setPagina]=useState(1);
  const [revision,setRevision]=useState(0);
  const [error,setError]=useState('');
  const [expandido,setExpandido]=useState<number|null>(null);
  const [vinculo,setVinculo]=useState<{
    operacion:CrmOperacionAgrupada;item:CrmOperacionAgrupadaLote;
  }|null>(null);
  const [candidatas,setCandidatas]=useState<CrmOperacionItem[]>([]);
  const [cargandoCandidatas,setCargandoCandidatas]=useState(false);
  const [idVenta,setIdVenta]=useState('');
  const [vinculando,setVinculando]=useState(false);

  useEffect(()=>{
    let live=true;
    if(!can('sales.create'))return;
    void Promise.all([crmBackend.prospectos(),coreService.getActiveProjects()])
      .then(([p,proy])=>{
        if(live){
          setProspectos(p.filter(x=>['INTERESADO','NEGOCIACION','CON_RESERVA','CONVERTIDO']
            .includes((x.estado_codigo||'').toUpperCase())));
          setProyectos(proy.filter(x=>x.activo));
        }
      })
      .catch(e=>{if(live)toast.error('No se pudieron cargar los catálogos',{description:msg(e)});});
    return ()=>{live=false;};
  },[can]);

  useEffect(()=>{
    let live=true;
    setCargando(true);setError('');
    void crmBackend.listarOperacionesAgrupadas(pagina,20)
      .then(data=>{if(live)setListado(data);})
      .catch(e=>{if(live){setListado(null);setError(msg(e));}})
      .finally(()=>{if(live)setCargando(false);});
    return ()=>{live=false;};
  },[pagina,revision]);

  useEffect(()=>{
    let live=true;
    setIdProyecto('');setIdEtapa('');setIdLote('');
    setProyectosElegibles([]);
    if(!idProspecto)return;
    const id=Number(idProspecto);
    void crmBackend.detalle(id).then(detalle=>{
      if(!live)return;
      const convertido=(prospectos.find(p=>p.id_prospecto===id)
        ?.estado_codigo??'').toUpperCase()==='CONVERTIDO';
      const intereses=new Set((detalle.intereses??[]).map(i=>i.idProyecto));
      setProyectosElegibles(proyectos.filter(x=>convertido||intereses.has(x.idProyecto))
        .map(x=>x.idProyecto));
    }).catch(e=>{if(live)toast.error('No se pudieron consultar proyectos de interés',{description:msg(e)});});
    return ()=>{live=false;};
  },[idProspecto,prospectos,proyectos]);

  useEffect(()=>{
    let live=true;
    setEtapas([]);setIdEtapa('');setIdLote('');
    if(!idProyecto)return;
    void coreService.getActiveStagesByProject(Number(idProyecto))
      .then(data=>{if(live)setEtapas(data.filter(x=>x.activo));})
      .catch(e=>{if(live)toast.error('No se pudieron obtener etapas',{description:msg(e)});});
    return ()=>{live=false;};
  },[idProyecto]);

  useEffect(()=>{
    let live=true;setLotes([]);setIdLote('');
    if(!idProyecto||!idEtapa||!idProspecto)return;
    setConsultandoLotes(true);
    void Promise.all([
      coreService.searchLots({idProyecto:Number(idProyecto),idEtapa:Number(idEtapa),activo:true}),
      coreService.getCommercializableLots(Number(idProyecto)),
      crmBackend.listarLotesReservadosDelProspecto(Number(idProspecto))
    ]).then(([all,comercializables,reservas])=>{
      if(!live)return;
      const permitidos=new Set(comercializables);
      const propios=new Set(reservas.idLotes);
      setLotes(all.filter(x=>x.activo
        &&x.idProyecto===Number(idProyecto)
        &&x.idEtapa===Number(idEtapa)
        &&!items.some(i=>i.idLote===x.idLote)
        &&(x.codigoEstadoLote==='DISPONIBLE'&&permitidos.has(x.idLote)
          ||x.codigoEstadoLote==='RESERVADO'&&propios.has(x.idLote))));
    }).catch(e=>{if(live)toast.error('No se pudieron consultar lotes',{description:msg(e)});})
      .finally(()=>{if(live)setConsultandoLotes(false);});
    return ()=>{live=false;};
  },[idProspecto,idProyecto,idEtapa,items]);

  const agregar=()=>{
    const lot=lotes.find(x=>String(x.idLote)===idLote);
    const pro=proyectos.find(x=>x.idProyecto===Number(idProyecto));
    if(!lot||!pro||items.some(i=>i.idLote===lot.idLote))return;
    if(items.length>=20){toast.error('Máximo 20 lotes por negociación.');return;}
    setItems(x=>[...x,{
      idLote:lot.idLote,codigoLote:lot.codigo,
      idProyecto:pro.idProyecto,idEtapa:Number(idEtapa),
      proyecto:pro.nombre,modalidad,
    }]);setIdLote('');
  };

  const crear=async()=>{
    if(guardando||!can('sales.create')||!idProspecto||items.length<2)return;
    setGuardando(true);
    try{
      const creado=await crmBackend.crearOperacionAgrupada({
        idProspecto:Number(idProspecto),
        lotes:items.map(x=>({idLote:x.idLote,modalidad:x.modalidad})),
        observaciones:observaciones.trim()||null
      });
      toast.success('Negociación multílote creada',{
        description:`${creado.codigo} · ${creado.cantidadLotes} lotes planificados`
      });
      setItems([]);setObservaciones('');setIdProspecto('');setIdProyecto('');
      setPagina(1);setRevision(x=>x+1);setExpandido(creado.idOperacion);
    }catch(e){toast.error('No se pudo crear la negociación',{description:msg(e)});}
    finally{setGuardando(false);}
  };
  const buscarVinculo=async(operacion:CrmOperacionAgrupada,item:CrmOperacionAgrupadaLote)=>{
    setVinculo({operacion,item});setCandidatas([]);setIdVenta('');setCargandoCandidatas(true);
    try{
      const response=await crmBackend.listarOperaciones({
        tipo:'VENTA',busqueda:item.codigoLote,pagina:1,tamano:50
      });
      setCandidatas(response.items.filter(x=>x.tipo==='VENTA'
        &&x.id_lote===item.idLote&&x.modalidad===item.modalidad
        &&x.estado.toUpperCase()!=='ANULADA'));
    }catch(e){toast.error('No se pudieron buscar ventas del lote',{description:msg(e)});}
    finally{setCargandoCandidatas(false);}
  };
  const guardarVinculo=async()=>{
    if(!vinculo||!idVenta||vinculando)return;
    setVinculando(true);
    try{
      await crmBackend.vincularVentaAgrupada(vinculo.operacion.idOperacion,Number(idVenta));
      toast.success('Venta asociada a la negociación',
        {description:'El contrato y las cuotas se mantienen individuales por lote.'});
      setVinculo(null);setRevision(n=>n+1);
    }catch(e){toast.error('No se pudo vincular la venta',{description:msg(e)});}
    finally{setVinculando(false);}
  };

  return <section className="space-y-5">
    <Alert tone="info" title="Negociación única; contratos individuales por lote">
      Esta planificación reúne varios lotes de un comprador, incluso entre proyectos,
      con modalidades al contado y financiadas. No reserva lotes ni crea pagos.
      Cada formalización se valida individualmente y después puede vincularse
      a esta negociación sin alterar el historial del cliente.
    </Alert>
    {can('sales.create')&&<Card>
      <CardHeader title="Planificar compra de varios lotes"
        description="Selecciona un comprador y añade entre 2 y 20 lotes con su modalidad."/>
      <div className="space-y-4 p-5">
        <label className="block text-xs font-semibold text-brand-700">
          Comprador o prospecto del CRM *
          <Select className="mt-1" value={idProspecto}
            disabled={items.length>0}
            onChange={e=>setIdProspecto(e.target.value)}>
            <option value="">Seleccionar persona…</option>
            {prospectos.map(p=><option key={p.id_prospecto} value={p.id_prospecto}>
              {p.nombre_completo} · {p.codigo} · {p.estado_nombre}
            </option>)}
          </Select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-brand-700 lg:col-span-2">
            Proyecto inmobiliario
            <Select className="mt-1" value={idProyecto} disabled={!idProspecto}
              onChange={e=>setIdProyecto(e.target.value)}>
              <option value="">Seleccionar proyecto…</option>
              {proyectos.filter(p=>proyectosElegibles.includes(p.idProyecto))
                .map(p=><option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>)}
            </Select>
          </label>
          <label className="text-xs font-semibold text-brand-700">
            Etapa
            <Select className="mt-1" value={idEtapa} disabled={!idProyecto}
              onChange={e=>setIdEtapa(e.target.value)}>
              <option value="">Seleccionar etapa…</option>
              {etapas.map(e=><option key={e.idEtapa} value={e.idEtapa}>{e.nombre}</option>)}
            </Select>
          </label>
          <label className="text-xs font-semibold text-brand-700">
            Lote
            <Select className="mt-1" value={idLote} disabled={!idEtapa||consultandoLotes}
              onChange={e=>setIdLote(e.target.value)}>
              <option value="">{consultandoLotes?'Consultando…':'Seleccionar lote…'}</option>
              {lotes.map(l=><option key={l.idLote} value={l.idLote}>
                {l.codigo} · {l.codigoEstadoLote}
              </option>)}
            </Select>
          </label>
          <label className="text-xs font-semibold text-brand-700">
            Modalidad por lote
            <Select className="mt-1" value={modalidad}
              onChange={e=>setModalidad(e.target.value as Modalidad)}>
              <option value="CONTADO">Contado</option>
              <option value="FINANCIADA">Financiado</option>
            </Select>
          </label>
        </div>
        <Button variant="secondary" icon={PlusIcon} disabled={!idLote||items.length>=20}
          onClick={agregar}>Añadir lote a la negociación</Button>
        {items.length>0&&<div className="rounded-xl border border-brand-100">
          <div className="border-b border-brand-100 bg-brand-50/60 px-4 py-3 text-xs font-semibold text-brand-900">
            Detalle de la negociación · {items.length} lotes
          </div>
          <Table head={<><TH>Proyecto y lote</TH><TH>Modalidad</TH><TH align="right">Acción</TH></>}>
            {items.map(item=><TR key={item.idLote}>
              <TD><span className="block text-brand-800">{item.proyecto}</span>
                <span className="block font-mono font-semibold text-brand-900">{item.codigoLote}</span></TD>
              <TD>{item.modalidad==='CONTADO'?'Al contado':'Financiado'}</TD>
              <TD align="right"><Button variant="ghost" size="sm"
                onClick={()=>setItems(a=>a.filter(x=>x.idLote!==item.idLote))}>Quitar</Button></TD>
            </TR>)}
          </Table>
        </div>}
        <label className="block text-xs font-semibold text-brand-700">
          Notas de esta negociación (opcional)
          <Input className="mt-1" value={observaciones} maxLength={500}
            placeholder="Condiciones conversadas, sin alterar la política de precios"
            onChange={e=>setObservaciones(e.target.value)}/>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-brand-500">
            El precio definitivo se valida en cada venta. No se generan contratos desde esta pantalla.
          </p>
          <Button variant="primary" icon={ShoppingCartIcon}
            disabled={items.length<2||guardando}
            onClick={()=>void crear()}>{guardando?'Creando…':'Crear negociación agrupada'}</Button>
        </div>
      </div>
    </Card>}

    <Card>
      <CardHeader title="Expedientes de negociaciones agrupadas"
        description="Una persona por expediente, varios lotes con ventas y contratos separados."
        actions={<Button size="sm" variant="secondary" icon={RefreshCwIcon}
          disabled={cargando} onClick={()=>setRevision(n=>n+1)}>Actualizar</Button>}/>
      {cargando&&<p className="p-5 text-sm text-brand-500">Consultando negociaciones…</p>}
      {error&&<p role="alert" className="p-5 text-sm text-red-700">{error}</p>}
      {!cargando&&!error&&!listado?.items.length&&
        <EmptyState title="Todavía no hay negociaciones agrupadas"
          description="Crea la primera adquisición planificada para un comprador y varios lotes."/>}
      {!cargando&&!error&&Boolean(listado?.items.length)&&<div className="space-y-3 p-4">
        {listado?.items.map(operacion=>{
          const abierto=expandido===operacion.idOperacion;
          const incidencias=operacion.lotes.some(x=>x.estadoVenta==='ANULADA');
          return <article className="overflow-hidden rounded-xl border border-brand-200" key={operacion.idOperacion}>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50/60 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <LayersIcon className="h-4 w-4 text-brand-700"/>
                  <h3 className="font-mono text-sm font-bold text-brand-900">{operacion.codigo}</h3>
                  <span className="rounded-md border border-brand-200 bg-white px-2 py-0.5 text-[11px] text-brand-700">
                    {operacion.cantidadVentas}/{operacion.cantidadLotes} ventas
                  </span>
                </div>
                <p className="mt-1 font-semibold text-brand-900">{operacion.comprador}</p>
                <p className="text-xs text-brand-500">
                  {operacion.codigoCliente||'Prospecto aún no convertido'} · {fecha(operacion.fechaCreacion)}
                  {incidencias?' · Tiene ventas anuladas':''}
                </p>
              </div>
              <Button variant="secondary" size="sm" icon={FolderOpenIcon}
                onClick={()=>setExpandido(abierto?null:operacion.idOperacion)}>
                {abierto?'Cerrar detalle':'Abrir expediente'}
              </Button>
            </div>
            {abierto&&<div className="space-y-3 p-4">
              {operacion.observaciones&&<p className="text-xs text-brand-600">
                <strong>Notas:</strong> {operacion.observaciones}
              </p>}
              <div className="overflow-x-auto">
                <Table head={<>
                  <TH>Proyecto y lote</TH><TH>Modalidad</TH>
                  <TH>Venta / contrato</TH><TH align="right">Importe venta</TH><TH align="right">Acción</TH>
                </>}>
                  {operacion.lotes.map(lote=><TR key={lote.idItem}>
                    <TD className="min-w-[200px]">
                      <span className="block">{lote.proyecto}</span>
                      <strong className="font-mono text-brand-900">{lote.codigoLote}</strong>
                    </TD>
                    <TD>{lote.modalidad==='CONTADO'?'Contado':'Financiado'}</TD>
                    <TD className="min-w-[205px]">
                      <span className="block font-mono">{lote.codigoVenta||'Pendiente de formalización'}</span>
                      <span className="block font-mono text-xs text-brand-500">
                        {lote.codigoContrato||'Contrato por lote pendiente'}
                      </span>
                      {lote.codigoPlan&&<span className="block text-xs text-brand-500">
                        Plan: {lote.codigoPlan}
                      </span>}
                      {lote.estadoVenta&&<span className="block text-xs text-brand-500">
                        {lote.estadoVenta} · {lote.estadoContrato??'Sin firma'}
                      </span>}
                    </TD>
                    <TD align="right" className="whitespace-nowrap">
                      {lote.precioVenta!==null?currency(lote.precioVenta):'Por validar'}
                    </TD>
                    <TD align="right">
                      {lote.idVenta? <span className="text-xs font-semibold text-emerald-700">
                        Venta vinculada
                      </span>:<div className="flex min-w-[130px] flex-wrap justify-end gap-2">
                        {can('sales.create')&&<Button size="sm" variant="primary"
                          onClick={()=>onPrepararVenta({
                            idOperacion:operacion.idOperacion,
                            idProspecto:operacion.idProspecto,idLote:lote.idLote,
                            idProyecto:lote.idProyecto,idEtapa:lote.idEtapa,modalidad:lote.modalidad
                          })}>Registrar venta</Button>}
                        {can('sales.create')&&<Button variant="secondary" size="sm" icon={Link2Icon}
                          onClick={()=>void buscarVinculo(operacion,lote)}>Vincular</Button>}
                      </div>}
                    </TD>
                  </TR>)}
                </Table>
              </div>
              <p className="text-xs text-brand-500">
                Una negociación puede estar parcialmente formalizada; cada contrato y obligación
                financiera se conserva íntegra en su venta por lote.
              </p>
            </div>}
          </article>;
        })}
        {(listado?.paginas??1)>1&&<div className="flex items-center justify-between px-2 py-2 text-xs text-brand-600">
          <span>Página {pagina} de {listado?.paginas}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={pagina<=1}
              onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
            <Button size="sm" variant="secondary" disabled={pagina>=(listado?.paginas??1)}
              onClick={()=>setPagina(p=>p+1)}>Siguiente</Button>
          </div>
        </div>}
      </div>}
    </Card>

    <Modal open={vinculo!==null} onClose={()=>{if(!vinculando)setVinculo(null);}}
      width="max-w-lg" title="Vincular venta existente"
      description={vinculo?`${vinculo.operacion.codigo} · ${vinculo.item.codigoLote}`:undefined}
      footer={<>
        <Button variant="secondary" disabled={vinculando}
          onClick={()=>setVinculo(null)}>Cancelar</Button>
        <Button variant="primary" icon={Link2Icon}
          disabled={!idVenta||vinculando} onClick={()=>void guardarVinculo()}>
          {vinculando?'Verificando…':'Vincular venta'}
        </Button>
      </>}>
      <div className="space-y-3">
        <Alert tone="info" title="Control de identidad y modalidad">
          Solo se asociará una venta que corresponda exactamente al mismo cliente, lote y modalidad.
          No se duplican contratos ni se modifican saldos.
        </Alert>
        <label className="block text-xs font-semibold text-brand-700">
          Venta identificada en el CRM
          <Select className="mt-1" value={idVenta} disabled={cargandoCandidatas}
            onChange={e=>setIdVenta(e.target.value)}>
            <option value="">Seleccionar venta del lote…</option>
            {candidatas.map(venta=><option key={venta.id} value={venta.id}>
              {venta.codigo} · {venta.comprador} · {venta.estado}
            </option>)}
          </Select>
        </label>
        {!cargandoCandidatas&&candidatas.length===0&&<p className="text-xs text-brand-600">
          No se encontró una venta formalizada para este lote. Regístrala primero desde
          la pestaña Ventas y después vuelve aquí para asociarla.
        </p>}
      </div>
    </Modal>
  </section>;
}
