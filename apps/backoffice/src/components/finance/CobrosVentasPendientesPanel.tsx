import { useEffect, useState } from 'react';
import { RefreshCwIcon, EyeIcon, CheckCircle2Icon, AlertTriangleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { SearchInput, Input, Select } from '../ui/Field';
import { Alert, EmptyState } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { Table, TD, TH, TR } from '../ui/Table';
import { useAuth } from '../../contexts/AuthContext';
import {
  crmBackend, type CrmCobrosVentasPendientesPage, type CrmCobroVentaPendiente,
  type CrmCuentasVenta, type CrmDesgloseComprobanteVenta,
} from '../../services/crmBackend';
import { currency } from '../../utils/format';

type Accion = 'APROBAR' | 'OBSERVAR' | 'CONCILIAR';
const fecha = (value: string) =>
  new Date(value).toLocaleDateString('es-PE',{timeZone:'America/Lima'});
const mensajeError = (e:unknown) => e instanceof Error ? e.message : 'Error de comunicación con Finanzas.';

export function CobrosVentasPendientesPanel() {
  const { can } = useAuth();
  const [busqueda,setBusqueda] = useState('');
  const [consulta,setConsulta] = useState('');
  const [pagina,setPagina] = useState(1);
  const [revision,setRevision] = useState(0);
  const [datos,setDatos] = useState<CrmCobrosVentasPendientesPage|null>(null);
  const [cuentas,setCuentas] = useState<CrmCuentasVenta|null>(null);
  const [errorCuentas,setErrorCuentas] = useState('');
  const [cargando,setCargando] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [seleccion,setSeleccion] = useState<CrmCobroVentaPendiente|null>(null);
  const [accion,setAccion] = useState<Accion>('APROBAR');
  const [motivo,setMotivo] = useState('');
  const [idCuenta,setIdCuenta] = useState('');
  const [fechaOperacion,setFechaOperacion] = useState('');
  const [referencia,setReferencia] = useState('');
  const [observaciones,setObservaciones] = useState('');
  const [confirmado,setConfirmado] = useState(false);
  const [revisados,setRevisados] = useState<number[]>([]);
  const [procesando,setProcesando] = useState(false);
  const [abriendo,setAbriendo] = useState<number|null>(null);
  const [subsanando,setSubsanando] = useState<number|null>(null);
  const [archivosAbiertos,setArchivosAbiertos] = useState<CrmCobroVentaPendiente|null>(null);
  const [detalleDocumento,setDetalleDocumento] = useState<{
    venta:CrmCobroVentaPendiente;
    desglose:CrmDesgloseComprobanteVenta;
    accion:Accion;
  }|null>(null);
  const [desgloseImportes,setDesgloseImportes] = useState<
    Record<number,{monto:string;numeroOperacion:string}>
  >({});
  const [editarDesglose,setEditarDesglose] = useState(false);
  const [confirmarDesglose,setConfirmarDesglose] = useState(false);
  const [revisadosDocumentos,setRevisadosDocumentos] = useState<number[]>([]);
  const [reinicio,setReinicio] = useState<CrmCobroVentaPendiente|null>(null);
  const [motivoReinicio,setMotivoReinicio] = useState('');
  const [confirmarReinicio,setConfirmarReinicio] = useState(false);

  useEffect(()=>{
    const timer = window.setTimeout(()=>{setPagina(1);setConsulta(busqueda.trim());},350);
    return ()=>window.clearTimeout(timer);
  },[busqueda]);
  useEffect(()=>{
    let vigente=true;
    setCargando(true);
    setError(null);
    void crmBackend.listarCobrosVentasPendientes({busqueda:consulta,pagina,tamano:20})
      .then(res=>{if(vigente)setDatos(res);})
      .catch(err=>{
        if(vigente){setDatos(null);setError(mensajeError(err));}
      })
      .finally(()=>{if(vigente)setCargando(false);});
    return ()=>{vigente=false;};
  },[consulta,pagina,revision]);
  useEffect(()=>{
    let vigente=true;
    void crmBackend.cuentasReceptorasVenta()
      .then(r=>{if(vigente){setCuentas(r);setErrorCuentas('');}})
      .catch(e=>{if(vigente)setErrorCuentas(mensajeError(e));});
    return ()=>{vigente=false;};
  },[revision]);

  const abrirArchivo = async (item:CrmCobroVentaPendiente,idComprobante=item.idComprobante) => {
    if (!idComprobante) return;
    // Se abre desde el click: el navegador no bloquea la ventana emergente.
    const ventana=window.open('about:blank','_blank');
    if(!ventana) {toast.error('Permite las ventanas emergentes para revisar el comprobante.');return;}
    ventana.opener=null;
    setAbriendo(item.idVenta);
    try {
      const res=await crmBackend.obtenerComprobanteVentaFinanzas(item.idVenta,idComprobante);
      if(!res.urlDescarga) throw new Error('No se recibió enlace de lectura.');
      ventana.location.replace(res.urlDescarga);
      setRevisados(old=>old.includes(item.idVenta)?old:[...old,item.idVenta]);
      setRevisadosDocumentos(old=>old.includes(idComprobante)?old:[...old,idComprobante]);
    } catch(e) {
      ventana.close();
      toast.error('No se pudo abrir la evidencia',{description:mensajeError(e)});
    } finally {setAbriendo(null);}
  };

  /** Solo añade soporte documental a una venta sin evidencia; nunca acredita fondos. */
  const subsanar=async(item:CrmCobroVentaPendiente,archivo:File)=>{
    if(subsanando!==null||item.comprobantes!==0||!can('finance.edit'))return;
    setSubsanando(item.idVenta);
    try{
      await crmBackend.subirComprobanteFaltanteVenta(item.idVenta,archivo);
      toast.success('Comprobante incorporado al expediente',
        {description:'Permanece pendiente de revisión financiera. No se confirmó dinero.'});
      setRevision(x=>x+1);
    }catch(e){
      toast.error('No se pudo subsanar el comprobante',{description:mensajeError(e)});
    }finally{setSubsanando(null);}
  };

  /** Total exacto en centavos; se evita redondear importes de banco implícitamente. */
  const montoCentavos=(value:string):number=>{
    if(!/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$/.test(value.trim()))return NaN;
    return Math.round(Number(value)*100);
  };
  const abrirDesglose=(venta:CrmCobroVentaPendiente)=>{
    const guardados=new Map(venta.desgloses.map(d=>[d.idComprobante,d] as const));
    setDesgloseImportes(Object.fromEntries(venta.archivos.map(archivo=>{
      const valor=guardados.get(archivo.idComprobante);
      return [archivo.idComprobante,{
        monto:valor?Number(valor.monto).toFixed(2):'',
        numeroOperacion:valor?.numeroOperacion??''
      }];
    })));
    setArchivosAbiertos(venta);
    setEditarDesglose(venta.desgloses.length===0);
    setConfirmarDesglose(false);
  };
  const guardarDesglose=async()=>{
    const venta=archivosAbiertos;
    if(!venta||procesando||!can('finance.edit')||!confirmarDesglose)return;
    if(venta.desgloses.some(d=>d.estado==='APROBADO'||d.estado==='CONCILIADO')){
      toast.error('No se puede cambiar una distribución ya aprobada o conciliada.');return;
    }
    const detalles=venta.archivos.map(archivo=>{
      const valor=desgloseImportes[archivo.idComprobante];
      return {idComprobante:archivo.idComprobante,
        monto:valor?.monto??'',numeroOperacion:valor?.numeroOperacion?.trim()??''};
    });
    const centavos=detalles.map(x=>montoCentavos(x.monto));
    if(centavos.some(x=>!Number.isSafeInteger(x)||x<=0)
       ||centavos.reduce((acc,n)=>acc+n,0)!==Math.round(Number(venta.montoOriginal)*100)){
      toast.error('Los importes deben ser positivos y sumar exactamente '+currency(venta.montoOriginal));return;
    }
    if(venta.metodoPago!=='Efectivo'&&detalles.some(x=>x.numeroOperacion.length<4)){
      toast.error('Identifica la referencia de cada transferencia o depósito.');return;
    }
    setProcesando(true);
    try{
      await crmBackend.configurarDesgloseVenta(venta.idVenta,detalles.map(x=>({
        idComprobante:x.idComprobante,monto:Number(x.monto),
        numeroOperacion:x.numeroOperacion||null
      })));
      toast.success('Desglose guardado para revisión',{
        description:'Cada comprobante se aprobará y conciliará individualmente. Aún no se confirma dinero.'
      });
      setArchivosAbiertos(null);
      setRevision(n=>n+1);
    }catch(e){toast.error('No se pudo guardar el desglose',{description:mensajeError(e)});}
    finally{setProcesando(false);}
  };
  const empezarDetalle=(
    venta:CrmCobroVentaPendiente,desglose:CrmDesgloseComprobanteVenta,accion:Accion
  )=>{
    setDetalleDocumento({venta,desglose,accion});setArchivosAbiertos(null);
    setMotivo('');setConfirmado(false);setIdCuenta('');
    setFechaOperacion('');setObservaciones('');setReferencia(desglose.numeroOperacion??'');
  };
  const enviarDetalle=async()=>{
    if(!detalleDocumento||procesando||!confirmado||!can('finance.edit'))return;
    const {venta,desglose,accion}=detalleDocumento;
    if(accion==='APROBAR'&&!revisadosDocumentos.includes(desglose.idComprobante)){
      toast.error('Debes abrir y revisar este comprobante original antes de aprobar.');return;
    }
    if(accion==='OBSERVAR'&&motivo.trim().length<10){
      toast.error('La observación requiere un motivo de al menos 10 caracteres.');return;
    }
    if(accion==='CONCILIAR'&&(!idCuenta||!fechaOperacion||(
      venta.metodoPago!=='Efectivo'&&!desglose.numeroOperacion
    ))){
      toast.error('Se requiere cuenta, fecha y referencia bancaria configurada.');return;
    }
    setProcesando(true);
    try{
      if(accion==='CONCILIAR'){
        const result=await crmBackend.conciliarDesgloseVenta(desglose.idDesglose,{
          idCuentaFinanciera:Number(idCuenta),fechaOperacion,observaciones:observaciones.trim()||null
        });
        toast.success('Comprobante conciliado contra cuenta real',{
          description:`Pago #${result.idPago} · ${currency(result.monto)} · ${result.comprobantesRestantes} comprobantes restantes`
        });
      }else{
        const result=await crmBackend.revisarDesgloseVenta(desglose.idDesglose,{
          aprobar:accion==='APROBAR',motivo:accion==='OBSERVAR'?motivo.trim():null
        });
        toast.success(result.estado==='APROBADO'?'Evidencia individual aprobada':'Observación registrada',{
          description:'La revisión documental no acredita dinero.'
        });
      }
      setDetalleDocumento(null);setRevision(n=>n+1);
    }catch(e){toast.error('No se completó la decisión financiera',{description:mensajeError(e)});}
    finally{setProcesando(false);}
  };

  /** Gerencia restablece solo evidencia no conciliada, preservando registro histórico. */
  const ejecutarReinicio=async()=>{
    if(!reinicio||procesando||!cuentas?.puedeConfigurar||!can('finance.edit')
       ||motivoReinicio.trim().length<10||!confirmarReinicio)return;
    setProcesando(true);
    try{
      await crmBackend.reiniciarDesgloseVenta(reinicio.idVenta,motivoReinicio);
      toast.success('Revisión documental reiniciada',{
        description:'El evento quedó auditado. No se anularon ingresos ni contratos.'
      });
      setReinicio(null);setArchivosAbiertos(null);
      setMotivoReinicio('');setRevision(x=>x+1);
    }catch(e){
      toast.error('No se pudo reiniciar el desglose',{description:mensajeError(e)});
    }finally{setProcesando(false);}
  };

  const empezar=(item:CrmCobroVentaPendiente,tipo:Accion)=>{
    setSeleccion(item);setAccion(tipo);
    setMotivo('');setConfirmado(false);setIdCuenta('');setFechaOperacion('');
    setReferencia(item.numeroOperacion??'');setObservaciones('');
  };
  const enviar=async()=>{
    if(!seleccion||procesando||!can('finance.edit'))return;
    const esConciliar=accion==='CONCILIAR';
    if(!confirmado){toast.error('Confirma que revisaste los datos de esta decisión.');return;}
    if(accion==='APROBAR'&&!revisados.includes(seleccion.idVenta)){
      toast.error('Abre primero el comprobante original para revisarlo.');return;
    }
    if(accion==='OBSERVAR'&&motivo.trim().length<10){
      toast.error('Registra un motivo de observación de al menos 10 caracteres.');return;
    }
    if(esConciliar&&(!idCuenta||!fechaOperacion||!referencia.trim())){
      toast.error('Selecciona una cuenta real, fecha y referencia bancaria.');return;
    }
    setProcesando(true);
    try{
      if(esConciliar){
        const r=await crmBackend.conciliarCobroVenta(seleccion.idVenta,{
          idCuentaFinanciera:Number(idCuenta),fechaOperacion,numeroOperacion:referencia.trim(),
          observaciones:observaciones.trim()||null
        });
        toast.success('Cobro conciliado y registrado',{description:
          `Pago #${r.idPago} · Movimiento #${r.idMovimiento} · ${currency(r.monto)}`});
      }else{
        const r=await crmBackend.revisarComprobanteVenta(
          seleccion.idVenta,seleccion.idComprobante!,{
            aprobar:accion==='APROBAR',motivo:accion==='OBSERVAR'?motivo.trim():null
          }
        );
        toast.success(r.decision==='APROBADO'
          ?'Evidencia aprobada: pendiente de conciliación bancaria'
          :'Observación registrada: el cobro continúa pendiente');
      }
      setSeleccion(null);
      setRevision(n=>n+1);
    }catch(e){toast.error('No se pudo completar la operación',{description:mensajeError(e)});}
    finally{setProcesando(false);}
  };

  return <div className="space-y-4">
    <Alert tone="warning" title="Revisión documental y conciliación son pasos distintos">
      Aprobar una evidencia no acredita fondos. Solo la conciliación contra una cuenta real
      genera el pago confirmado, su movimiento financiero y, si corresponde, su aplicación
      a la inicial. No uses una cuenta de demostración ni reutilices una transferencia entre lotes.
    </Alert>
    <Card>
      <CardHeader title="Cobros de ventas pendientes"
        description="Separa comprobantes pendientes de revisar de evidencias aprobadas aún sin conciliar."
        actions={<div className="flex flex-wrap items-center gap-2">
          <SearchInput className="w-full sm:w-64" label="Buscar cobro pendiente"
            placeholder="Venta, cliente, proyecto o lote..."
            value={busqueda} onValueChange={setBusqueda}/>
          <Button variant="secondary" icon={RefreshCwIcon} disabled={cargando}
            onClick={()=>setRevision(x=>x+1)}>Actualizar</Button>
        </div>}/>
      {datos && !error && <div className="flex flex-wrap items-center gap-6 border-b border-brand-100 px-5 py-3 text-xs text-brand-600">
        <span>Por verificar: <strong className="text-brand-900">{datos.porVerificar}</strong></span>
        <span>Por conciliar: <strong className="text-brand-900">{datos.porConciliar}</strong></span>
        <span>Importe sin confirmar: <strong className="text-brand-900">{currency(datos.montoPendiente)}</strong></span>
      </div>}
      {errorCuentas && <div className="px-4 pt-3"><Alert tone="danger" title="No se pudieron consultar cuentas">{errorCuentas}</Alert></div>}
      {cuentas && cuentas.cuentas.length===0 && <div className="px-4 pt-3">
        <Alert tone="warning" title="No existe una cuenta receptora real habilitada">
          Puedes revisar las evidencias, pero la conciliación se mantendrá bloqueada
          hasta configurar en Finanzas una cuenta real, activa y compatible con el medio de pago.
        </Alert>
      </div>}
      {error && <div className="p-4"><Alert tone="danger" title="No se pudo consultar la bandeja">{error}</Alert></div>}
      {cargando && <p className="p-5 text-sm text-brand-500">Consultando pagos de ventas…</p>}
      {!cargando && !error && datos?.total===0 &&
        <EmptyState title="Sin cobros pendientes" description="No existen operaciones por revisar o conciliar para esta búsqueda."/>}
      {!cargando && !error && Boolean(datos?.total) && <div className="overflow-x-auto">
        <Table head={<>
          <TH>Venta / contrato</TH><TH>Comprador</TH><TH>Proyecto / lote</TH>
          <TH>Tipo de abono</TH><TH>Evidencia</TH>
          <TH align="right">Importe</TH><TH>Revisión</TH><TH align="right">Acciones</TH>
        </>}>
          {datos?.items.map(item=><TR key={item.idVenta}>
            <TD><span className="block whitespace-nowrap font-semibold text-brand-900">{item.codigoVenta}</span>
              <span className="block whitespace-nowrap text-xs text-brand-500">{item.codigoContrato??'Sin contrato'}</span>
              <span className="block text-xs text-brand-400">{fecha(item.fechaVenta)}</span></TD>
            <TD className="min-w-[165px]">{item.comprador??'Sin titular identificado'}</TD>
            <TD className="min-w-[155px]">{item.proyecto}
              <span className="block whitespace-nowrap font-mono font-semibold text-brand-800">{item.codigoLote}</span></TD>
            <TD className="whitespace-nowrap">{item.tipoAbono==='INICIAL'?'Inicial financiada':'Contado'}</TD>
            <TD className="whitespace-nowrap">
              {item.comprobantes===1?'1 comprobante':item.comprobantes===0?'Sin comprobante':`${item.comprobantes} comprobantes`}
              <span className="block text-xs text-brand-500">{item.metodoPago}</span>
            </TD>
            <TD align="right" className="whitespace-nowrap font-semibold tabular-nums">
              {currency(item.montoPendiente)}
            </TD>
            <TD>
              <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${
                item.estadoRevision==='APROBADO'
                  ?'border-sky-200 bg-sky-50 text-sky-800'
                  :'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {item.estadoRevision==='APROBADO'?'Soporte aprobado':'Por verificar'}
              </span>
              {item.ultimaDecision==='OBSERVADO'&&item.observacion&&
                <span className="block max-w-[200px] break-words pt-1 text-xs text-amber-800">
                  Observado: {item.observacion}
                </span>}
            </TD>
            <TD align="right">
              <div className="flex min-w-[140px] flex-wrap justify-end gap-1.5">
                {item.idComprobante&&item.comprobantes===1&&
                  <Button size="sm" variant="ghost" icon={EyeIcon}
                    disabled={abriendo===item.idVenta} onClick={()=>void abrirArchivo(item)}>Ver</Button>}
                {can('finance.edit')&&item.estadoRevision==='PENDIENTE'&&item.comprobantes===1&&
                  <>
                    <Button size="sm" variant="secondary" icon={CheckCircle2Icon}
                      onClick={()=>empezar(item,'APROBAR')}>Aprobar soporte</Button>
                    <Button size="sm" variant="ghost" icon={AlertTriangleIcon}
                      onClick={()=>empezar(item,'OBSERVAR')}>Observar</Button>
                  </>}
                {can('finance.edit')&&item.estadoRevision==='APROBADO'&&
                  <Button size="sm" variant="primary"
                    disabled={!cuentas?.cuentas.length} onClick={()=>empezar(item,'CONCILIAR')}>
                    Conciliar
                  </Button>}
                {can('finance.edit')&&item.estadoRevision==='PENDIENTE'&&item.comprobantes===0&&
                  <label className="block max-w-[220px] text-left text-xs font-semibold text-brand-700">
                    {subsanando===item.idVenta?'Cargando evidencia…':'Adjuntar evidencia faltante'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="mt-1 block w-full max-w-[210px] text-[11px] text-brand-600"
                      disabled={subsanando!==null}
                      onChange={e=>{
                        const input=e.currentTarget;
                        const file=input.files?.[0];
                        if(file)void subsanar(item,file).finally(()=>{input.value='';});
                      }}/>
                  </label>}
                {item.comprobantes>1&&<>
                  <Button size="sm" variant="secondary" icon={EyeIcon}
                    onClick={()=>abrirDesglose(item)}>
                    Gestionar {item.comprobantes} comprobantes
                  </Button>
                  <span className="block whitespace-nowrap text-xs text-brand-600">
                    {item.comprobantesConciliados}/{item.comprobantes} conciliados
                  </span>
                  {item.desgloses.length===0&&<span className="text-xs text-amber-700">
                    Requiere desglose por importe y transferencia
                  </span>}
                </>}
              </div>
            </TD>
          </TR>)}
        </Table>
      </div>}
      {datos && datos.paginas>1 && !cargando && <div className="flex items-center justify-between border-t border-brand-100 px-5 py-4 text-xs text-brand-500">
        <span>Página {pagina} de {datos.paginas} · {datos.total} operaciones</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pagina<=1} onClick={()=>setPagina(p=>Math.max(1,p-1))}>Anterior</Button>
          <Button variant="secondary" size="sm" disabled={pagina>=datos.paginas} onClick={()=>setPagina(p=>p+1)}>Siguiente</Button>
        </div>
      </div>}
    </Card>

    <Modal open={archivosAbiertos!==null}
      onClose={()=>{if(!procesando)setArchivosAbiertos(null);}}
      width="max-w-3xl" title="Detalle de comprobantes y pagos individuales"
      description={archivosAbiertos?.codigoVenta}
      footer={editarDesglose&&archivosAbiertos&&can('finance.edit')?<>
        <Button variant="secondary" disabled={procesando}
          onClick={()=>setArchivosAbiertos(null)}>Cancelar</Button>
        <Button variant="primary" disabled={procesando||!confirmarDesglose}
          onClick={()=>void guardarDesglose()}>
          {procesando?'Guardando…':'Guardar distribución de importes'}
        </Button>
      </>:undefined}>
      <div className="space-y-4">
        <Alert tone="warning" title="Un comprobante = un abono identificable">
          La suma del desglose debe coincidir con el importe pendiente original.
          Cada evidencia se revisará y conciliará con una referencia y cuenta real.
          No se permite atribuir el mismo abono bancario a varios contratos.
        </Alert>
        {archivosAbiertos&&<div className="flex flex-wrap gap-4 rounded-lg bg-brand-50 px-4 py-3 text-xs text-brand-800">
          <span>Venta: <strong>{currency(archivosAbiertos.montoOriginal)}</strong></span>
          <span>Sin confirmar: <strong>{currency(archivosAbiertos.montoPendiente)}</strong></span>
          <span>Conciliados: <strong>{archivosAbiertos.comprobantesConciliados}/{archivosAbiertos.comprobantes}</strong></span>
        </div>}
        {archivosAbiertos?.archivos.map(archivo=>{
          const d=archivosAbiertos.desgloses.find(x=>x.idComprobante===archivo.idComprobante);
          const val=desgloseImportes[archivo.idComprobante];
          return <div key={archivo.idComprobante}
            className="space-y-3 rounded-xl border border-brand-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-all text-xs font-semibold text-brand-900">{archivo.nombreArchivo}</p>
                <p className="mt-1 text-xs text-brand-500">
                  Estado: {d?.estado??archivo.estadoRevision} · {archivo.tipoMime}
                </p>
                {d?.motivo&&<p className="mt-1 text-xs text-amber-700">Observación: {d.motivo}</p>}
                {d?.idPago&&<p className="mt-1 text-xs text-emerald-700">
                  Conciliado · Pago #{d.idPago}
                </p>}
              </div>
              <Button size="sm" variant="secondary" icon={EyeIcon}
                disabled={abriendo!==null}
                onClick={()=>{if(archivosAbiertos)void abrirArchivo(archivosAbiertos,archivo.idComprobante);}}>
                Ver evidencia privada
              </Button>
            </div>
            {editarDesglose? <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-brand-700">
                Importe de este comprobante *
                <Input type="number" min="0.01" step="0.01" className="mt-1"
                  value={val?.monto??''}
                  onChange={e=>setDesgloseImportes(old=>({
                    ...old,[archivo.idComprobante]:{
                      monto:e.target.value,
                      numeroOperacion:old[archivo.idComprobante]?.numeroOperacion??''
                    }
                  }))}/>
              </label>
              <label className="text-xs font-semibold text-brand-700">
                Referencia de operación bancaria
                <Input className="mt-1" maxLength={100}
                  value={val?.numeroOperacion??''}
                  onChange={e=>setDesgloseImportes(old=>({
                    ...old,[archivo.idComprobante]:{
                      monto:old[archivo.idComprobante]?.monto??'',
                      numeroOperacion:e.target.value
                    }
                  }))}/>
              </label>
            </div>: d&& <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="font-medium text-brand-900">
                {currency(d.monto)} · Referencia: {d.numeroOperacion||'Efectivo sin referencia'}
              </p>
              {can('finance.edit')&&d.estado==='PENDIENTE'&&<>
                <Button size="sm" variant="secondary" icon={CheckCircle2Icon}
                  onClick={()=>empezarDetalle(archivosAbiertos!,d,'APROBAR')}>
                  Aprobar evidencia
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={()=>empezarDetalle(archivosAbiertos!,d,'OBSERVAR')}>
                  Observar
                </Button>
              </>}
              {can('finance.edit')&&d.estado==='APROBADO'&&
                <Button size="sm" variant="primary" disabled={!cuentas?.cuentas.length}
                  onClick={()=>empezarDetalle(archivosAbiertos!,d,'CONCILIAR')}>
                  Conciliar este abono
                </Button>}
            </div>}
          </div>;
        })}
        {archivosAbiertos&&can('finance.edit')
          &&archivosAbiertos.desgloses.length>0
          &&archivosAbiertos.desgloses.every(d=>d.estado==='PENDIENTE'||d.estado==='OBSERVADO')
          &&<Button variant="secondary" size="sm"
            onClick={()=>{setEditarDesglose(true);setConfirmarDesglose(false);}}>
            Corregir distribución (con auditoría)
          </Button>}
        {archivosAbiertos&&cuentas?.puedeConfigurar&&can('finance.edit')
          &&archivosAbiertos.desgloses.length>1
          &&archivosAbiertos.desgloses.some(d=>d.estado==='APROBADO'||d.estado==='OBSERVADO')
          &&archivosAbiertos.desgloses.every(d=>d.estado!=='CONCILIADO'&&!d.idPago)
          &&<Button variant="secondary" size="sm" onClick={()=>{
            setMotivoReinicio('');setConfirmarReinicio(false);setReinicio(archivosAbiertos);
          }}>
            Reiniciar revisión de comprobantes (Gerencia)
          </Button>}
        {editarDesglose&&archivosAbiertos&&<div className="space-y-3 rounded-lg bg-brand-50 p-4">
          <p className="text-xs font-semibold text-brand-900">
            Total digitado: {currency(archivosAbiertos.archivos.reduce((total,archivo)=>
              total+Math.max(0,montoCentavos(desgloseImportes[archivo.idComprobante]?.monto??'')||0)/100,0))}
          </p>
          <p className="text-xs text-brand-600">
            Debe coincidir con {currency(archivosAbiertos.montoOriginal)}. La distribución
            aún no acredita pagos ni modifica los contratos.
          </p>
          <label className="flex items-start gap-2 text-xs text-brand-700">
            <input type="checkbox" checked={confirmarDesglose}
              onChange={e=>setConfirmarDesglose(e.target.checked)}/>
            Confirmo que contrasté los importes y las referencias con cada comprobante original.
          </label>
        </div>}
      </div>
    </Modal>

    <Modal open={reinicio!==null} onClose={()=>{if(!procesando)setReinicio(null);}}
      title="Reiniciar revisión documental" width="max-w-lg"
      description={reinicio?.codigoVenta}
      footer={<>
        <Button variant="secondary" disabled={procesando} onClick={()=>setReinicio(null)}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={procesando||!confirmarReinicio
          ||motivoReinicio.trim().length<10} onClick={()=>void ejecutarReinicio()}>
          Reiniciar con auditoría
        </Button>
      </>}>
      <div className="space-y-4">
        <Alert tone="warning" title="Acción exclusiva de Gerencia">
          Solo se permite cuando ningún comprobante de la venta fue conciliado.
          Se conservan el motivo y los estados anteriores en el historial de auditoría.
          Los contratos, pagos y movimientos históricos no se eliminan.
        </Alert>
        <label className="block text-xs font-semibold text-brand-700">
          Motivo obligatorio (entre 10 y 500 caracteres)
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-brand-200 p-3 text-sm"
            value={motivoReinicio} maxLength={500} onChange={e=>setMotivoReinicio(e.target.value)}
            placeholder="Justifica por qué se requiere corregir la documentación…"/>
        </label>
        <label className="flex gap-2 text-xs text-brand-700">
          <input type="checkbox" checked={confirmarReinicio}
            onChange={e=>setConfirmarReinicio(e.target.checked)}/>
          He verificado que no existen pagos conciliados y autorizo reiniciar la revisión.
        </label>
      </div>
    </Modal>

    <Modal open={detalleDocumento!==null} onClose={()=>{if(!procesando)setDetalleDocumento(null);}}
      width="max-w-xl"
      title={detalleDocumento?.accion==='CONCILIAR'?'Conciliar abono individual':
        detalleDocumento?.accion==='APROBAR'?'Aprobar evidencia individual':'Observar evidencia'}
      description={detalleDocumento
        ?`${detalleDocumento.venta.codigoVenta} · ${currency(detalleDocumento.desglose.monto)}`
        :undefined}
      footer={<>
        <Button variant="secondary" disabled={procesando}
          onClick={()=>setDetalleDocumento(null)}>Cancelar</Button>
        <Button variant="primary" disabled={procesando||!confirmado}
          onClick={()=>void enviarDetalle()}>
          {procesando?'Procesando…':'Confirmar decisión'}
        </Button>
      </>}>
      <div className="space-y-4">
        {detalleDocumento?.accion==='CONCILIAR'?<>
          <Alert tone="warning" title="Esta operación confirmará dinero">
            Verifica el abono individual y su referencia bancaria. Se creará un pago,
            movimiento y voucher solo por este importe. La inicial financiada se imputará
            al plan de este lote, no a otros lotes.
          </Alert>
          <p className="text-xs font-semibold text-brand-800">
            Referencia: {detalleDocumento.desglose.numeroOperacion||'Efectivo'}
          </p>
          <label className="block text-xs font-semibold text-brand-700">
            Cuenta receptora real
            <Select className="mt-1" value={idCuenta}
              onChange={e=>setIdCuenta(e.target.value)}>
              <option value="">Seleccionar cuenta…</option>
              {cuentas?.cuentas.map(c=><option key={c.idCuenta} value={c.idCuenta}>
                {c.nombre} · {c.codigo} ({c.tipo})
              </option>)}
            </Select>
          </label>
          <label className="block text-xs font-semibold text-brand-700">
            Fecha efectiva de operación
            <Input className="mt-1" type="date" value={fechaOperacion}
              max={new Date().toISOString().slice(0,10)}
              onChange={e=>setFechaOperacion(e.target.value)}/>
          </label>
          <label className="block text-xs font-semibold text-brand-700">
            Observaciones
            <Input className="mt-1" value={observaciones} maxLength={300}
              onChange={e=>setObservaciones(e.target.value)}/>
          </label>
        </>:detalleDocumento?.accion==='OBSERVAR'?<label className="block text-xs font-semibold text-brand-700">
          Motivo de la observación (mínimo 10 caracteres)
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-brand-200 p-3 text-sm"
            maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)}
            placeholder="Indica el importe, referencia u otro dato a corregir…"/>
        </label>:<Alert tone="info" title="Aprobación documental">
          Aprueba únicamente esta evidencia. El dinero no quedará confirmado hasta
          que se ejecute la conciliación individual con su cuenta receptora real.
        </Alert>}
        <label className="flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
          <input type="checkbox" checked={confirmado}
            onChange={e=>setConfirmado(e.target.checked)}/>
          {detalleDocumento?.accion==='CONCILIAR'
            ?'Confirmo haber cotejado el abono y su referencia en la cuenta bancaria real.'
            :'Confirmo que revisé el comprobante y la decisión que estoy registrando.'}
        </label>
      </div>
    </Modal>

    <Modal open={seleccion!==null} onClose={()=>{if(!procesando)setSeleccion(null);}}
      width="max-w-xl"
      title={accion==='CONCILIAR'?'Conciliar cobro bancario':accion==='APROBAR'?'Aprobar comprobante':'Registrar observación'}
      description={seleccion ? `${seleccion.codigoVenta} · ${currency(seleccion.montoPendiente)}` : undefined}
      footer={<>
        <Button variant="secondary" disabled={procesando}
          onClick={()=>setSeleccion(null)}>Cancelar</Button>
        <Button variant="primary" disabled={procesando||!confirmado||(
          accion==='CONCILIAR'&&(!idCuenta||!fechaOperacion||!referencia.trim())
        )} onClick={()=>void enviar()}>
          {procesando?'Procesando…':accion==='CONCILIAR'?'Confirmar conciliación':accion==='APROBAR'?'Aprobar evidencia':'Guardar observación'}
        </Button>
      </>}>
      <div className="space-y-4">
        {accion==='CONCILIAR'?<>
          <Alert tone="warning" title="Este paso sí confirmará dinero">
            Solo continúa después de cotejar el abono en la cuenta receptora.
            La operación registrará el movimiento y, para financiación, imputará la inicial.
          </Alert>
          <label className="block text-xs font-semibold text-brand-700">Cuenta receptora real *
            <Select className="mt-1" value={idCuenta} onChange={e=>setIdCuenta(e.target.value)}>
              <option value="">Seleccionar cuenta…</option>
              {cuentas?.cuentas.map(c=><option value={c.idCuenta} key={c.idCuenta}>
                {c.nombre} · {c.codigo} ({c.tipo})
              </option>)}
            </Select>
          </label>
          <label className="block text-xs font-semibold text-brand-700">Fecha real de operación *
            <Input className="mt-1" type="date" max={new Date().toISOString().slice(0,10)}
              value={fechaOperacion} onChange={e=>setFechaOperacion(e.target.value)}/>
          </label>
          <label className="block text-xs font-semibold text-brand-700">Referencia bancaria verificada *
            <Input className="mt-1" value={referencia} maxLength={100}
              onChange={e=>setReferencia(e.target.value)}/>
          </label>
          <label className="block text-xs font-semibold text-brand-700">Observaciones
            <Input className="mt-1" value={observaciones} maxLength={300}
              onChange={e=>setObservaciones(e.target.value)}/>
          </label>
        </>:accion==='APROBAR'?<Alert tone="info" title="Solo validación documental">
          Esta decisión no confirma un abono ni reduce saldos. Después será necesario
          conciliarlo contra una cuenta real.
        </Alert>:<label className="block text-xs font-semibold text-brand-700">
          Motivo de la observación (10 caracteres como mínimo)
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-brand-200 p-3 text-sm text-brand-900"
            value={motivo} maxLength={500} onChange={e=>setMotivo(e.target.value)}
            placeholder="Explica qué debe corregirse o verificarse…"/>
          <span className="mt-1 block text-brand-500">El cobro seguirá pendiente. No se anulará dinero ni contrato.</span>
        </label>}
        <label className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs text-brand-800">
          <input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)} />
          {accion==='CONCILIAR'
            ? 'Confirmo que cotejé este importe y referencia con el movimiento bancario real y autorizo su registro.'
            : accion==='APROBAR'
              ? 'He revisado el archivo original y confirmo que esta evidencia corresponde a la venta.'
              : 'Confirmo el motivo de la observación y solicito su revisión sin reconocer dinero.'}
        </label>
      </div>
    </Modal>
  </div>;
}
