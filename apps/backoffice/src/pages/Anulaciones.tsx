import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Tabs } from '../components/ui/Tabs';
import { Table, TD, TH, TR } from '../components/ui/Table';
import { crmBackend, type CrmOperacionItem } from '../services/crmBackend';
import { ExpedienteLegalPanel } from '../components/anulaciones/ExpedienteLegalPanel';
import {
  anulacionesBackend, type AccionGerencia, type CasoLegal,
  type CategoriaMotivo, type EstadoSolicitud, type EventoAnulacion,
  type ResultadoRevision, type SolicitudAnulacion, type TipoOperacion
} from '../services/anulacionesBackend';

type Pestaña = 'solicitudes' | 'finanzas' | 'legal';
type Expediente = {
  idSolicitud: number;
  idOperacion: number;
  tipoOperacion: TipoOperacion;
  codigoOperacion: string;
  codigoLote?: string;
  estado: EstadoSolicitud;
  motivo: string;
  version: number;
  requiereRevisionLegal: boolean;
};
const ESTADOS: EstadoSolicitud[] = [
  'SOLICITADA', 'EN_REVISION', 'PENDIENTE_FINANZAS', 'PENDIENTE_LEGAL',
  'APROBADA', 'RECHAZADA', 'EJECUTADA', 'CANCELADA'
];
const CATEGORIAS: {codigo: CategoriaMotivo; nombre: string}[] = [
  {codigo:'DESISTIMIENTO_CLIENTE',nombre:'Desistimiento del cliente'},
  {codigo:'MUTUO_ACUERDO',nombre:'Mutuo acuerdo'},
  {codigo:'ERROR_COMERCIAL',nombre:'Error comercial'},
  {codigo:'INCUMPLIMIENTO',nombre:'Incumplimiento'},
  {codigo:'OTRO',nombre:'Otro motivo'}
];
const ACCIONES: {codigo: AccionGerencia; nombre: string}[] = [
  {codigo:'INICIAR_REVISION',nombre:'Iniciar revisión'},
  {codigo:'DERIVAR_FINANZAS',nombre:'Derivar a Finanzas'},
  {codigo:'DERIVAR_LEGAL',nombre:'Derivar a Asesoría Legal'},
  {codigo:'APROBAR',nombre:'Aprobar solicitud (sin ejecutar)'},
  {codigo:'RECHAZAR',nombre:'Rechazar solicitud'}
];
const RESULTADOS: ResultadoRevision[] = ['CONFORME','OBSERVADA','NO_PROCEDE'];
const fecha = (valor?: string | null) => {
  if (!valor) return '—';
  const f = new Date(valor);
  return Number.isNaN(f.valueOf()) ? '—' : f.toLocaleString('es-PE', {
    timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'
  });
};
const estadoClass = (estado: EstadoSolicitud) => {
  if (estado === 'APROBADA' || estado === 'EJECUTADA') return 'bg-emerald-50 text-emerald-700';
  if (estado === 'RECHAZADA' || estado === 'CANCELADA') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-800';
};
const resumenSolicitud = (s: SolicitudAnulacion): Expediente => ({
  idSolicitud:s.idSolicitud, idOperacion:s.idOperacion,
  tipoOperacion:s.tipoOperacion, codigoOperacion:s.codigoOperacion,
  codigoLote:s.codigoLote, estado:s.estado, motivo:s.motivo,
  version:s.version, requiereRevisionLegal:s.requiereRevisionLegal
});
const resumenLegal = (s: CasoLegal): Expediente => ({
  idSolicitud:s.idSolicitud, idOperacion:s.idVenta,
  tipoOperacion:'VENTA', codigoOperacion:s.codigoOperacion,
  estado:s.estado, motivo:s.motivo,version:s.version,requiereRevisionLegal:true
});

export function Anulaciones() {
  const { can, user } = useAuth();
  const comercial = can('sales.view');
  const gerencia = can('sales.annul') && user.roles.includes('Gerencia');
  const finanzas = can('finance.edit') && user.roles.includes('Finanzas') && !user.roles.includes('Gerencia');
  const legal = can('sales.legal.review') && user.roles.includes('Asesoría Legal') && !user.roles.includes('Gerencia');
  const puedeSolicitar = comercial && user.roles.some((r) =>
    ['Gerencia','Administrador','Asesor','Supervisor comercial'].includes(r));

  const [tab, setTab] = useState<Pestaña>(comercial ? 'solicitudes' : legal ? 'legal' : 'finanzas');
  const [items, setItems] = useState<SolicitudAnulacion[]>([]);
  const [casos, setCasos] = useState<CasoLegal[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [tipo, setTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [revision, setRevision] = useState(0);
  const [seleccion, setSeleccion] = useState<Expediente | null>(null);
  const [historial, setHistorial] = useState<EventoAnulacion[]>([]);
  const [idEvidencia, setIdEvidencia] = useState<number | null>(null);
  const [accion, setAccion] = useState<AccionGerencia>('INICIAR_REVISION');
  const [resultado, setResultado] = useState<ResultadoRevision>('OBSERVADA');
  const [sustento, setSustento] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [nuevo, setNuevo] = useState(false);
  const [operaciones, setOperaciones] = useState<CrmOperacionItem[]>([]);
  const [cargandoOperaciones, setCargandoOperaciones] = useState(false);
  const [busquedaOperacion, setBusquedaOperacion] = useState('');
  const [tipoNueva, setTipoNueva] = useState<TipoOperacion>('SEPARACION');
  const [idOperacion, setIdOperacion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMotivo>('DESISTIMIENTO_CLIENTE');
  const [motivo, setMotivo] = useState('');

  const pestañas = [
    ...(comercial ? [{ id:'solicitudes',label:'Solicitudes comerciales' }] : []),
    ...(finanzas ? [{ id:'finanzas',label:'Revisión de Finanzas' }] : []),
    ...(legal ? [{ id:'legal',label:'Asesoría Legal' }] : [])
  ];

  useEffect(() => {
    if (!(comercial || legal || finanzas)) return;
    let activo = true;
    setCargando(true);
    setError(null);
    const cargar = async () => {
      try {
        if (tab === 'legal') {
          const respuesta = await anulacionesBackend.listarCasosLegales(pagina, 20);
          if (!activo) return;
          setCasos(respuesta.items ?? []);
          setItems([]);
          setPaginas(Math.max(1,respuesta.paginas ?? 1));
          setTotal(respuesta.total ?? 0);
        } else {
          const respuesta = await anulacionesBackend.listar({
            tipo: tab === 'finanzas' ? undefined : tipo,
            estado: tab === 'finanzas' ? 'PENDIENTE_FINANZAS' : estado,
            busqueda: tab === 'finanzas' ? undefined : busquedaAplicada,
            pagina,tamano:20
          });
          if (!activo) return;
          setItems(respuesta.items ?? []);
          setCasos([]);
          setPaginas(Math.max(1,respuesta.paginas ?? 1));
          setTotal(respuesta.total ?? 0);
        }
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo cargar la bandeja.');
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    return () => { activo = false; };
  }, [comercial,legal,finanzas,tab,estado,busquedaAplicada,tipo,pagina,revision]);

  useEffect(() => {
    if (!seleccion || !comercial) { setHistorial([]); return; }
    let activo = true;
    anulacionesBackend.historial({tipo:seleccion.tipoOperacion,
      idOperacion:seleccion.idOperacion,pagina:1,tamano:30})
      .then((r) => { if (activo) setHistorial(r.items ?? []); })
      .catch(() => { if (activo) setHistorial([]); });
    return () => { activo = false; };
  }, [seleccion,comercial]);

  const cargarOperaciones = async () => {
    setCargandoOperaciones(true);
    try {
      const r = await crmBackend.listarOperaciones({
        tipo:tipoNueva,busqueda:busquedaOperacion.trim(),pagina:1,tamano:100
      });
      setOperaciones(r.items ?? []);
    } catch (err) {
      setOperaciones([]);
      toast.error(err instanceof Error ? err.message : 'No fue posible consultar operaciones.');
    } finally {
      setCargandoOperaciones(false);
    }
  };
  useEffect(() => {
    if (!nuevo) return;
    setIdOperacion('');
    void cargarOperaciones();
    // Los cambios de tipo o apertura vuelven a buscar operaciones elegibles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevo,tipoNueva]);

  const abrirExpediente = (e: Expediente) => {
    setSeleccion(e);
    setAccion(e.estado === 'SOLICITADA' ? 'INICIAR_REVISION' : 'DERIVAR_FINANZAS');
    setResultado('OBSERVADA');
    setSustento('');
    setIdEvidencia(null);
  };

  const solicitar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!idOperacion || !Number.isSafeInteger(Number(idOperacion)) || Number(idOperacion) <= 0 ||
        motivo.trim().length < 20 || motivo.trim().length > 2000) {
      toast.error('Selecciona una operación e indica un motivo de 20 a 2000 caracteres.');
      return;
    }
    setGuardando(true);
    try {
      const r = await anulacionesBackend.solicitar({
        tipoOperacion:tipoNueva,idOperacion:Number(idOperacion),categoriaMotivo:categoria,motivo:motivo.trim()
      });
      if (!r.success) throw new Error(r.mensaje || 'No fue posible registrar la solicitud.');
      toast.success('Solicitud registrada. No se ha anulado ni liberado el lote.');
      setNuevo(false);
      setMotivo('');
      setPagina(1);
      setRevision((x) => x + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar la solicitud.');
    } finally { setGuardando(false); }
  };

  const dictaminar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const s = seleccion;
    if (!s) return;
    const texto = sustento.trim();
    const minimo = tab === 'solicitudes' ? 20 : 40;
    if (texto.length < minimo || texto.length > 2000) {
      toast.error(`Ingresa una justificación de ${minimo} a 2000 caracteres.`);
      return;
    }
    if (tab === 'legal' && resultado === 'CONFORME' && !idEvidencia) {
      toast.error('Para un dictamen conforme selecciona un informe o acuerdo legal registrado.');
      return;
    }
    setGuardando(true);
    try {
      const r = tab === 'legal'
        ? await anulacionesBackend.revisarLegal(s.idSolicitud, {
          versionEsperada:s.version,resultado,sustento:texto,idEvidencia
        })
        : tab === 'finanzas'
          ? await anulacionesBackend.revisarFinanzas(s.idSolicitud, {
            versionEsperada:s.version,resultado,sustento:texto
          })
          : await anulacionesBackend.decidir(s.idSolicitud, {
            versionEsperada:s.version,accion,justificacion:texto
          });
      if (!r.success) throw new Error(r.mensaje || 'La operación no fue confirmada.');
      toast.success(r.mensaje || 'Decisión registrada.');
      setSeleccion(null);
      setPagina(1);
      setRevision((x) => x + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar la decisión.');
    } finally { setGuardando(false); }
  };

  if (!(comercial || legal || finanzas)) {
    return <Card className="p-6 text-sm text-rose-700" role="alert">
      No tienes autorización para acceder al módulo de anulaciones.
    </Card>;
  }

  return <div className="space-y-5">
    <PageHeader title="Anulaciones comerciales"
      description="Solicitudes, revisiones independientes y expediente documental. La aprobación no ejecuta la anulación."
      actions={<div className="flex gap-2">
        <Button icon={RefreshCw} onClick={() => setRevision((x) => x + 1)}>Actualizar</Button>
        {puedeSolicitar && <Button variant="primary" icon={Plus} onClick={() => setNuevo(true)}>Nueva solicitud</Button>}
      </div>} />

    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Una solicitud o dictamen favorable no cancela pagos, ventas ni contratos, ni libera automáticamente el lote.
    </div>

    <Tabs active={tab} className="mb-4" items={pestañas}
      onChange={(id) => {setTab(id as Pestaña);setPagina(1);setSeleccion(null);}} />

    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-brand-100 p-4">
        {tab === 'solicitudes' && <>
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => {
            e.preventDefault();setPagina(1);setBusquedaAplicada(busqueda.trim());
          }}>
            <label className="text-xs text-brand-600">Buscar
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                className="mt-1 w-60" placeholder="Operación, lote o motivo" maxLength={120} />
            </label>
            <Button type="submit" icon={Search}>Buscar</Button>
          </form>
          <label className="text-xs text-brand-600">Tipo
            <Select value={tipo} onChange={(e) => {setTipo(e.target.value);setPagina(1);}}
              className="mt-1 min-w-[130px]">
              <option value="">Todos</option><option value="SEPARACION">Separación</option>
              <option value="VENTA">Venta</option>
            </Select>
          </label>
          <label className="text-xs text-brand-600">Estado
            <Select value={estado} onChange={(e) => {setEstado(e.target.value);setPagina(1);}}
              className="mt-1 min-w-[180px]">
              <option value="">Todos</option>
              {ESTADOS.map((x) => <option key={x} value={x}>{x.replace(/_/g,' ')}</option>)}
            </Select>
          </label>
        </>}
        <div className="ml-auto text-xs text-brand-500">{total} expediente(s)</div>
      </div>
      {cargando ? <p role="status" className="p-6 text-sm text-brand-600">Consultando bandeja…</p> :
        error ? <p role="alert" className="p-6 text-sm text-rose-700">{error}</p> :
          (tab === 'legal' ? casos.length === 0 : items.length === 0) ?
            <p className="p-6 text-sm text-brand-600">No se encontraron solicitudes para esta bandeja.</p> :
            <Table head={<>
              <TH>Solicitud</TH><TH>Operación / lote</TH><TH>Motivo</TH>
              <TH>Estado</TH><TH>Fecha</TH><TH>Acción</TH>
            </>}>
              {tab === 'legal' ? casos.map((s) => <TR key={s.idSolicitud}>
                <TD className="font-mono text-xs">#{s.idSolicitud}</TD>
                <TD><div className="font-medium">{s.codigoOperacion}</div><div className="text-xs text-brand-500">Venta</div></TD>
                <TD className="max-w-[280px] text-xs">{s.motivo}</TD>
                <TD><span className={`rounded px-2 py-1 text-xs ${estadoClass(s.estado)}`}>PENDIENTE LEGAL</span></TD>
                <TD className="text-xs">{fecha(s.fechaSolicitud)}</TD>
                <TD><Button size="sm" onClick={() => abrirExpediente(resumenLegal(s))}>Revisar expediente</Button></TD>
              </TR>) : items.map((s) => <TR key={s.idSolicitud}>
                <TD className="font-mono text-xs">#{s.idSolicitud}</TD>
                <TD><div className="font-medium">{s.codigoOperacion}</div>
                  <div className="text-xs text-brand-500">{s.tipoOperacion} · {s.codigoLote}</div></TD>
                <TD className="max-w-[280px] text-xs">{s.motivo}</TD>
                <TD><span className={`rounded px-2 py-1 text-xs ${estadoClass(s.estado)}`}>
                  {s.estado.replace(/_/g,' ')}</span></TD>
                <TD className="text-xs">{fecha(s.fechaSolicitud)}</TD>
                <TD><Button size="sm" onClick={() => abrirExpediente(resumenSolicitud(s))}>
                  {tab === 'finanzas' ? 'Revisar Finanzas' : 'Ver expediente'}</Button></TD>
              </TR>)}
            </Table>}
      <div className="flex items-center justify-between border-t border-brand-100 p-3 text-xs">
        <span>Página {pagina} de {paginas}</span>
        <div className="flex gap-2">
          <Button size="sm" disabled={pagina <= 1} onClick={() => setPagina((x) => x-1)}>Anterior</Button>
          <Button size="sm" disabled={pagina >= paginas} onClick={() => setPagina((x) => x+1)}>Siguiente</Button>
        </div>
      </div>
    </Card>

    <Modal open={nuevo} onClose={() => {if (!guardando) setNuevo(false);}}
      width="max-w-2xl" title="Solicitar anulación comercial"
      description="El registro solo abre un expediente; no afecta la operación ni el lote.">
      <form className="space-y-4" onSubmit={(e) => void solicitar(e)}>
        <label className="block text-xs font-medium">Tipo de operación
          <Select value={tipoNueva} disabled={guardando} className="mt-1"
            onChange={(e) => setTipoNueva(e.target.value as TipoOperacion)}>
            <option value="SEPARACION">Separación</option><option value="VENTA">Venta</option>
          </Select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Buscar operaciones" className="min-w-0 flex-1"
            maxLength={120} value={busquedaOperacion} placeholder="Buscar por código, comprador o lote"
            onChange={(e) => setBusquedaOperacion(e.target.value)} />
          <Button disabled={cargandoOperaciones || guardando} onClick={() => void cargarOperaciones()}>
            {cargandoOperaciones ? 'Buscando…' : 'Buscar'}</Button>
        </div>
        <label className="block text-xs font-medium">Operación registrada
          <Select required value={idOperacion} disabled={guardando || cargandoOperaciones}
            className="mt-1" onChange={(e) => setIdOperacion(e.target.value)}>
            <option value="">Selecciona una operación</option>
            {operaciones.map((op) => <option key={`${op.tipo}-${op.id}`} value={op.id}>
              {op.codigo} · {op.lote} · {op.comprador} · {op.estado}
            </option>)}
          </Select>
        </label>
        <label className="block text-xs font-medium">Motivo de la solicitud
          <Select className="mt-1" value={categoria} disabled={guardando}
            onChange={(e) => setCategoria(e.target.value as CategoriaMotivo)}>
            {CATEGORIAS.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </Select>
        </label>
        <label className="block text-xs font-medium">Justificación (20–2000 caracteres)
          <textarea required minLength={20} maxLength={2000} rows={5}
            className="mt-1 w-full rounded-md border border-brand-200 p-3 text-sm"
            value={motivo} disabled={guardando} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <Button disabled={guardando} onClick={() => setNuevo(false)}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={guardando || !idOperacion || motivo.trim().length < 20}>
            {guardando ? 'Registrando…' : 'Registrar solicitud'}</Button>
        </div>
      </form>
    </Modal>

    <Modal open={seleccion !== null} width="max-w-4xl"
      title={seleccion ? `Expediente de anulación #${seleccion.idSolicitud}` : 'Expediente'}
      description={seleccion ? `${seleccion.codigoOperacion} · Versión ${seleccion.version} · ${seleccion.estado.replace(/_/g,' ')}` : ''}
      onClose={() => {if (!guardando) setSeleccion(null);}}>
      {seleccion && <div className="space-y-4">
        <Card className="p-4">
          <p className="text-xs font-semibold text-brand-500">Motivo comercial</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-800">{seleccion.motivo}</p>
        </Card>

        {seleccion.tipoOperacion === 'VENTA' && seleccion.requiereRevisionLegal &&
          (legal || gerencia) &&
          <ExpedienteLegalPanel key={seleccion.idSolicitud}
            idSolicitud={seleccion.idSolicitud}
            puedeCargar={gerencia && seleccion.estado === 'PENDIENTE_LEGAL'}
            seleccion={idEvidencia}
            onSeleccionar={tab === 'legal' ? setIdEvidencia : undefined} />}

        {comercial && historial.length > 0 && <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">Historial de la operación</h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-brand-600">
            {historial.filter((h) => h.idSolicitud === seleccion.idSolicitud)
              .map((h) => <li key={h.idHistorial} className="border-b border-brand-100 pb-2">
                {fecha(h.fechaEvento)} · {h.evento.replace(/_/g,' ')} · Usuario #{h.idUsuarioActor ?? '—'}
              </li>)}
          </ul>
        </Card>}

        {((tab === 'solicitudes' && gerencia &&
           ['SOLICITADA','EN_REVISION','PENDIENTE_FINANZAS','PENDIENTE_LEGAL'].includes(seleccion.estado)) ||
          (tab === 'finanzas' && finanzas && seleccion.estado === 'PENDIENTE_FINANZAS') ||
          (tab === 'legal' && legal && seleccion.estado === 'PENDIENTE_LEGAL')) &&
          <form className="space-y-3 rounded-lg border border-brand-100 p-4" onSubmit={(e) => void dictaminar(e)}>
            <h3 className="text-sm font-semibold">{tab === 'solicitudes' ? 'Decisión de Gerencia' :
              tab === 'finanzas' ? 'Dictamen financiero' : 'Dictamen jurídico independiente'}</h3>
            {tab === 'solicitudes' ? <Select value={accion} disabled={guardando}
              aria-label="Acción de Gerencia"
              onChange={(e) => setAccion(e.target.value as AccionGerencia)}>
              {ACCIONES.map((x) => <option key={x.codigo} value={x.codigo}>{x.nombre}</option>)}
            </Select> : <Select value={resultado} disabled={guardando}
              aria-label="Resultado de revisión"
              onChange={(e) => setResultado(e.target.value as ResultadoRevision)}>
              {RESULTADOS.map((x) => <option key={x} value={x}>{x.replace(/_/g,' ')}</option>)}
            </Select>}
            <label className="block text-xs font-medium">Sustento obligatorio ({tab === 'solicitudes' ? '20' : '40'}–2000 caracteres)
              <textarea rows={4} maxLength={2000} required
                minLength={tab === 'solicitudes' ? 20 : 40} value={sustento}
                onChange={(e) => setSustento(e.target.value)} disabled={guardando}
                className="mt-1 w-full rounded-md border border-brand-200 p-3 text-sm" />
            </label>
            {tab === 'legal' && resultado === 'CONFORME' && <p className="text-xs text-amber-800">
              Selecciona arriba el PDF de informe legal o acuerdo de resolución. Sin documento verificable
              no se admite conformidad.
            </p>}
            <div className="flex justify-end">
              <Button type="submit" variant="primary"
                disabled={guardando || sustento.trim().length < (tab === 'solicitudes' ? 20 : 40) ||
                  (tab === 'legal' && resultado === 'CONFORME' && !idEvidencia)}>
                {guardando ? 'Guardando…' : 'Registrar decisión'}</Button>
            </div>
          </form>}
      </div>}
    </Modal>
  </div>;
}
