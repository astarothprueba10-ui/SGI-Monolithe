import { useEffect, useState } from 'react';
import { LockIcon, TablePropertiesIcon, ShieldCheckIcon, HistoryIcon, PencilIcon } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input, Select, FieldLabel } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { useAuth } from '../../../contexts/AuthContext';
import { projectConfigurationService } from '../../../services/projectConfigurationService';
import { CommercialZoneLegend } from './CommercialZoneLegend';
import { CommercialHistoryEntry } from './CommercialHistoryEntry';
import { contarZonaEtapa } from '../../../lib/commercialZoneUsage';
import { inventarioPorEtapa } from '../../../lib/commercialPresentation';
import type { ConfiguracionProyectoResponse, GestionComercialResponse, EventoComercial, TarifaComercial } from '../../../types/projectConfiguration';
import type { ProyectoResponse } from '../../../types/core';

const soles = (v: number) => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(v);
const hoy = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function CommercialManagementPanel({ config, version, project }: { config: ConfiguracionProyectoResponse; version: number; project: ProyectoResponse }) {
  const { can } = useAuth();
  const [seccion, setSeccion] = useState<'tarifas' | 'disponibilidad' | 'historial'>('disponibilidad');
  const [actual, setActual] = useState<GestionComercialResponse | null>(null);
  const [inventario, setInventario] = useState(config);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [historial, setHistorial] = useState<EventoComercial[] | null>(null);
  const [etapa, setEtapa] = useState(config.datos.etapas[0]?.codigo ?? '');
  const [tarifa, setTarifa] = useState<TarifaComercial | null>(null);
  const [soloUsadas,setSoloUsadas]=useState(true);
  const [confirmar,setConfirmar]=useState<'tarifa'|'disponibilidad'|null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [intento, setIntento] = useState(0);
  const editable = project.activo && can('lots.edit');
  const id = project.idProyecto;

  useEffect(() => {
    let vigente = true;
    setActual(null); setError(''); setAviso(''); setHistorial(null);
    Promise.all([projectConfigurationService.gestion(id),projectConfigurationService.obtener(id)])
      .then(([g,c]) => { if(vigente) {setActual(g);setSeleccion(g.estado.etapasHabilitadas);setInventario(c);} })
      .catch(e => {if(vigente) setError(e instanceof Error ? e.message : 'No se pudo cargar la gestión comercial.');});
    return () => {vigente=false;};
  },[id,intento]);

  useEffect(() => {
    if(seccion!=='historial') return;
    let vigente=true;
    projectConfigurationService.historial(id).then(r=>{if(vigente)setHistorial(r);})
      .catch(e=>{if(vigente)setError(e instanceof Error?e.message:'No se pudo consultar el historial.');});
    return ()=>{vigente=false;};
  },[id,seccion,actual?.revision,intento]);

  const originales = actual?.estado.etapasHabilitadas ?? [];
  const cambios = config.datos.etapas.filter(e=>seleccion.includes(e.codigo)!==originales.includes(e.codigo));
  const cambiar = (codigo:string, marcada:boolean) => setSeleccion(prev=>marcada?[...prev.filter(c=>c!==codigo),codigo]:prev.filter(c=>c!==codigo));

  async function guardarDisponibilidad(confirmada=false) {
    if (!actual || ocupado || !editable || (!cambios.length && !actual.inferida)) return;
    if (!confirmada) {setConfirmar('disponibilidad');return;}
    setConfirmar(null);
    setOcupado(true);setError('');setAviso('');
    try {
      const r=await projectConfigurationService.guardarDisponibilidad(id,actual.revision,seleccion);
      setActual(r);setSeleccion(r.estado.etapasHabilitadas);setAviso('Disponibilidad guardada. No se generó otra publicación.');
      try {setInventario(await projectConfigurationService.obtener(id));}
      catch {setError('La disponibilidad se guardó, pero no se pudo actualizar el inventario mostrado. Recarga los datos.');}
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo guardar la disponibilidad.');}
    finally {setOcupado(false);}
  }

  async function guardarTarifa(confirmada=false) {
    if (!actual || !tarifa || ocupado || !editable) return;
    const t=tarifa;
    if(!Number.isFinite(t.valor)||t.valor<=0||!t.vigenteDesde||t.vigenteDesde>hoy()||t.vigenteHasta!==null&&(t.vigenteHasta<t.vigenteDesde||t.vigenteHasta<hoy())) {
      setError('Ingresa un precio positivo y fechas de vigencia que incluyan el día de hoy.');return;
    }
    if(!confirmada) {setConfirmar('tarifa');return;}
    setConfirmar(null);
    setOcupado(true);setError('');setAviso('');
    try {
      const r=await projectConfigurationService.guardarTarifa(id,actual.revision,t);
      setActual(r);setTarifa(null);setAviso('Tarifa guardada. Las demás combinaciones, las operaciones protegidas y la disponibilidad se conservan.');
      try {setInventario(await projectConfigurationService.obtener(id));}
      catch {setError('La tarifa se guardó, pero no se pudo recargar el inventario.');}
    } catch(e) {setError(e instanceof Error?e.message:'No se pudo guardar la tarifa.');}
    finally {setOcupado(false);}
  }

  if (config.version !== version || actual && actual.version!==version) return <Card className="p-5"><h2 className="font-semibold text-brand-900">Gestión comercial</h2><p role="alert" className="mt-2 text-sm text-brand-700">La versión consultada no coincide con la configuración publicada. Recarga el proyecto.</p></Card>;
  if (!actual) return <Card className="p-5"><p role={error?'alert':'status'} className="text-sm text-brand-700">{error||'Cargando gestión comercial…'}</p>{error&&<Button onClick={()=>setIntento(n=>n+1)}>Reintentar</Button>}</Card>;
  const tarifas = actual.estado.tarifas;
  const uso = contarZonaEtapa(inventario,etapa);
  const zonasVisibles = inventario.zonas.filter(z=>!soloUsadas || (uso.get(z)??0)>0);
  return <Card className="p-5 space-y-5">
    <header><h2 className="text-lg font-semibold text-brand-900">Gestión comercial</h2>
      <p className="text-sm text-brand-600">Configuración inicial finalizada (v{version}). Administra los precios y la disponibilidad sin volver a publicar.</p></header>
    <div className="grid gap-2 sm:grid-cols-3">
      {['Importar Excel','Etapas iniciales','Asignaciones iniciales'].map(t => <div key={t} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 p-3 text-sm text-gray-500"><LockIcon className="h-4 w-4"/>{t}</div>)}
    </div>
    <nav aria-label="Gestión comercial permanente" className="flex flex-wrap gap-2">
      <Button disabled={ocupado} icon={TablePropertiesIcon} variant={seccion==='tarifas'?'primary':'secondary'} onClick={() => {setSeccion('tarifas');setError('');}}>Matriz de tarifas</Button>
      <Button disabled={ocupado} icon={ShieldCheckIcon} variant={seccion==='disponibilidad'?'primary':'secondary'} onClick={() => {setSeccion('disponibilidad');setError('');}}>Disponibilidad comercial</Button>
      <Button disabled={ocupado} icon={HistoryIcon} variant={seccion==='historial'?'primary':'secondary'} onClick={() => {setSeccion('historial');setError('');}}>Historial</Button>
    </nav>
    {error && !tarifa && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {aviso && <p role="status" className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>}
    {seccion === 'disponibilidad' && <section className="space-y-3">
      <h3 className="font-semibold text-brand-900">Disponibilidad de etapas comerciales</h3>
      <p className="text-sm text-brand-600">Marca las etapas que deseas mantener abiertas. Desmarca las que deseas cerrar. No se recalculan precios.</p>
      {actual.inferida && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Publicación anterior: la selección se propone a partir de sus reglas comerciales, no del inventario. Confirma el estado deseado para registrarlo. Si faltan precios preparados, revisa la matriz.</p>}
      <div className="grid gap-2 md:grid-cols-2">{config.datos.etapas.map(e => {
        const i=inventarioPorEtapa(inventario,e.codigo);const abierta=seleccion.includes(e.codigo);
        return <label key={e.codigo} className={`flex gap-3 rounded-lg border p-3 ${abierta?'border-[#4cbb17] bg-[#4cbb17]/10':'border-gray-200 bg-gray-50'}`}>
          <input aria-label={e.nombre} type="checkbox" className="mt-1 h-4 w-4 accent-[#4cbb17]" checked={abierta} disabled={!editable||ocupado} onChange={event=>cambiar(e.codigo,event.target.checked)}/>
          <span><span className="block font-semibold text-brand-900">{e.nombre}</span><span className="block text-xs text-brand-500">{e.codigo} · {i.total} lotes · {i.disponibles} disponibles · {i.protegidos} vendidos/reservados</span>
          <span className={`block mt-1 text-sm font-medium ${abierta?'text-emerald-700':'text-gray-500'}`}>{abierta?'Abierta':'Cerrada'}{abierta!==originales.includes(e.codigo)?' (por guardar)':''}</span></span>
        </label>;
      })}</div>
      {cambios.length>0 && <p className="text-sm text-brand-700">Cambios: {cambios.map(e=>`${seleccion.includes(e.codigo)?'Abrir':'Cerrar'} ${e.nombre}`).join(' · ')}</p>}
      <div className="flex flex-wrap gap-2 justify-end"><Button disabled={ocupado||!cambios.length} onClick={()=>setSeleccion([...originales])}>Restablecer</Button>
        <Button variant="primary" disabled={!editable||ocupado||(!cambios.length&&!actual.inferida)} onClick={()=>void guardarDisponibilidad()}>{ocupado?'Guardando…':'Guardar disponibilidad'}</Button></div>
    </section>}
    {seccion === 'tarifas' && <section className="space-y-4">
      <h3 className="font-semibold text-brand-900">Matriz de tarifas</h3>
      <CommercialZoneLegend projectId={id} codigos={config.zonas}/>
      <p className="text-sm text-brand-600">Edita una combinación de etapa y zona. El sistema aplica el cambio a los lotes correspondientes, sin reabrir etapas ni modificar ventas y reservas. Moneda PEN.</p>
      <div className="max-w-sm"><FieldLabel htmlFor="gestion-etapa">Etapa comercial</FieldLabel><Select id="gestion-etapa" disabled={ocupado} value={etapa} onChange={e=>setEtapa(e.target.value)}>{config.datos.etapas.map(e=><option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</Select></div>
      <label className="flex items-center gap-2 text-sm text-brand-700"><input type="checkbox" checked={soloUsadas} onChange={e=>setSoloUsadas(e.target.checked)}/> Mostrar solo zonas utilizadas ({inventario.zonas.filter(z=>(uso.get(z)??0)>0).length})</label>
      {zonasVisibles.length===0&&<p className="text-sm text-brand-600">No hay zonas utilizadas en esta etapa. Desmarca el filtro para preparar tarifas opcionales.</p>}
      <div className="overflow-auto rounded-lg border border-brand-200"><table className="w-full text-left text-sm">
        <thead className="bg-brand-50"><tr>{['Zona','Lotes asociados','Tarifa PEN','Modalidad','Vigencia','Acción'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>{zonasVisibles.map(z=>{
          const t=tarifas.find(x=>x.codigoEtapa===etapa&&x.codigoZona===z&&x.moneda==='PEN');
          return <tr key={z} className="border-t border-brand-100"><td className="p-3 font-medium">{z}</td><td className="p-3">{uso.get(z)??0}</td><td className="p-3">{t?soles(t.valor):(uso.get(z)??0)>0?'Sin tarifa configurada':'Opcional · sin lotes'}</td><td className="p-3">{t?.tipoTarifa==='POR_M2'?'Por m²':t?'Por lote':'—'}</td>
            <td className="p-3">{t?`${t.vigenteDesde} — ${t.vigenteHasta??'Sin fin'}`:'—'}</td>
            <td className="p-3"><Button size="sm" icon={PencilIcon} disabled={!editable||ocupado||!etapa} onClick={()=>{setError('');setTarifa(t?{...t}:{codigoZona:z,codigoEtapa:etapa,moneda:'PEN',tipoTarifa:'MONTO_FIJO',valor:0,vigenteDesde:hoy(),vigenteHasta:null});}}>{t?'Editar':'Crear'}</Button></td></tr>;
        })}</tbody></table></div>
    </section>}
    {seccion === 'historial' && <section className="space-y-3">
      <h3 className="font-semibold text-brand-900">Historial comercial</h3>
      <p className="text-xs text-brand-500">Últimos 50 eventos registrados. Las publicaciones anteriores a esta función no cuentan con el nuevo detalle de auditoría.</p>
      {!historial?<p>Cargando historial…</p>:historial.length===0?<p>No hay eventos registrados.</p>:historial.map(e=><CommercialHistoryEntry key={e.id} evento={e} config={inventario}/>)}
    </section>}
    <Modal open={tarifa!==null} title="Actualizar tarifa" onClose={()=>{if(!ocupado){setTarifa(null);setError('');}}}
      description="El cambio se aplica al precio comercial, no a la disponibilidad."
      footer={<><Button disabled={ocupado} onClick={()=>{setTarifa(null);setError('');}}>Cancelar</Button><Button variant="primary" disabled={!editable||ocupado} onClick={()=>void guardarTarifa()}>{ocupado?'Guardando…':'Guardar tarifa'}</Button></>}>
      {tarifa&&<fieldset disabled={ocupado} className="space-y-3">
        <p className="text-sm text-brand-700">{config.datos.etapas.find(e=>e.codigo===tarifa.codigoEtapa)?.nombre} · Zona {tarifa.codigoZona} · PEN</p>
        <div><FieldLabel htmlFor="tarifa-valor">{tarifa.tipoTarifa==='POR_M2'?'Precio por m² (PEN)':'Precio total por lote (PEN)'}</FieldLabel><Input id="tarifa-valor" type="number" min="0.0001" step="0.0001" value={tarifa.valor} onChange={e=>setTarifa({...tarifa,valor:Number(e.target.value)})}/></div>
        <p className="text-xs text-brand-600">Ingresa el precio completo, no el recargo. Las promociones se calculan aparte.</p>
        <div><FieldLabel htmlFor="tarifa-tipo">Modalidad</FieldLabel><Select id="tarifa-tipo" value={tarifa.tipoTarifa} onChange={e=>setTarifa({...tarifa,tipoTarifa:e.target.value as TarifaComercial['tipoTarifa']})}><option value="MONTO_FIJO">Por lote</option><option value="POR_M2">Por m²</option></Select></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><FieldLabel htmlFor="tarifa-desde">Vigente desde</FieldLabel><Input id="tarifa-desde" type="date" max={hoy()} value={tarifa.vigenteDesde} onChange={e=>setTarifa({...tarifa,vigenteDesde:e.target.value})}/></div>
          <div><FieldLabel htmlFor="tarifa-hasta">Vigente hasta (opcional)</FieldLabel><Input id="tarifa-hasta" type="date" min={hoy()} value={tarifa.vigenteHasta??''} onChange={e=>setTarifa({...tarifa,vigenteHasta:e.target.value||null})}/></div></div>
        <p className="text-xs text-brand-500">No se programan cambios futuros desde este formulario. Puedes guardar la misma tarifa para reparar precios preparados de publicaciones anteriores.</p>
        {error&&<p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </fieldset>}
    </Modal>
    <Modal open={confirmar!==null} title={confirmar==='tarifa'?'Confirmar actualización de tarifa':'Confirmar disponibilidad'} onClose={()=>setConfirmar(null)}
      footer={<><Button onClick={()=>setConfirmar(null)}>Volver</Button><Button variant="primary" disabled={ocupado} onClick={()=>void (confirmar==='tarifa'?guardarTarifa(true):guardarDisponibilidad(true))}>Confirmar cambios</Button></>}>
      {confirmar==='tarifa'&&tarifa?<div className="space-y-2 text-sm"><p>Etapa {tarifa.codigoEtapa} · Zona {tarifa.codigoZona}</p><p>Nuevo precio: <strong>{soles(tarifa.valor)} {tarifa.tipoTarifa==='POR_M2'?'/ m²':'/ lote'}</strong></p><p>Lotes asociados: {contarZonaEtapa(inventario,tarifa.codigoEtapa).get(tarifa.codigoZona)??0} (incluye operaciones protegidas).</p><p>Solo se actualizan lotes elegibles; las ventas y reservas se conservan.</p></div>:<div className="space-y-2 text-sm"><p>{cambios.map(e=>`${seleccion.includes(e.codigo)?'Abrir':'Cerrar'} ${e.nombre}`).join(' · ')||'Confirmar selección actual'}</p><p>Se conservan los precios y las operaciones protegidas.</p></div>}
    </Modal>
  </Card>;
}

