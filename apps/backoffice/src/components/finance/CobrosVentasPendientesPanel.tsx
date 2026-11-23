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
  type CrmCuentasVenta,
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
                    onClick={()=>setArchivosAbiertos(item)}>
                    Ver {item.comprobantes} comprobantes
                  </Button>
                  <span className="text-xs text-amber-700">
                    Revisión de importes bloqueada hasta desglose bancario
                  </span>
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
      onClose={()=>setArchivosAbiertos(null)}
      width="max-w-xl"
      title="Comprobantes asociados a una venta"
      description={archivosAbiertos?.codigoVenta}>
      <div className="space-y-3">
        <Alert tone="warning" title="Varios comprobantes no equivalen a un solo pago">
          Estos archivos pueden representar transferencias distintas. Hasta que se
          registre el importe y la referencia correspondientes a cada uno,
          no se permitirá aprobar ni conciliar el total como si fuera una única operación.
        </Alert>
        {archivosAbiertos?.archivos.map(archivo=><div key={archivo.idComprobante}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 p-3">
          <div className="min-w-0">
            <p className="break-all text-xs font-semibold text-brand-900">{archivo.nombreArchivo}</p>
            <p className="mt-1 text-[11px] text-brand-500">
              {archivo.tipoMime} · {archivo.estadoRevision}
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={EyeIcon}
            disabled={abriendo!==null}
            onClick={()=>void abrirArchivo(archivosAbiertos,archivo.idComprobante)}>
            Ver original
          </Button>
        </div>)}
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
