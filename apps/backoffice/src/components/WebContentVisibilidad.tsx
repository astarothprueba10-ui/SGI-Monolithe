import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  webContentDraftService, type BorradorCms, type ProyectoVisibilidadCms
} from '../services/webContentDraftService';

// Activación independiente: no habilitar hasta desplegar y auditar la migración de historial.
const PUBLICACION_HABILITADA = import.meta.env.VITE_CMS_PUBLICACION_VISIBILIDAD_HABILITADA === 'true';

export function WebContentVisibilidad() {
  const { can } = useAuth();
  const puedeAdministrar = can('web_content.projects_visibility');
  const puedePublicar = puedeAdministrar && can('web_content.publish');
  const [proyectos, setProyectos] = useState<ProyectoVisibilidadCms[]>([]);
  const [borradores, setBorradores] = useState<BorradorCms[]>([]);
  const [idProyecto, setIdProyecto] = useState<number | null>(null);
  const [seleccionado, setSeleccionado] = useState<BorradorCms | null>(null);
  const [propuesta, setPropuesta] = useState(false);
  const [revisionPrevisualizada, setRevisionPrevisualizada] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const proyecto = proyectos.find((p) => p.idProyecto === idProyecto) ?? null;
  const borradoresVisibilidad = borradores.filter((b) => b.tipoObjetivo === 'VISIBILIDAD_PROYECTO'
    && b.estado === 'EN_EDICION');
  const valorGuardado = seleccionado?.contenidoPendiente.visible_publico;
  const mismaPropuesta = typeof valorGuardado === 'boolean' && valorGuardado === propuesta;
  const previsualizado = seleccionado !== null && proyecto !== null
    && seleccionado.idProyecto === proyecto.idProyecto && mismaPropuesta
    && revisionPrevisualizada === seleccionado.revisionEdicion;
  const hayCambio = previsualizado && proyecto.visiblePublico !== propuesta;
  const propuestaDiferente = proyecto !== null && proyecto.visiblePublico !== propuesta;

  async function recargar() {
    const [catalogo, propios] = await Promise.all([
      webContentDraftService.listarProyectosVisibilidad(), webContentDraftService.listar()
    ]);
    setProyectos(catalogo);
    setBorradores(propios);
    return { catalogo, propios };
  }

  useEffect(() => {
    if (!puedeAdministrar) { setCargando(false); return; }
    let vigente = true;
    Promise.all([
      webContentDraftService.listarProyectosVisibilidad(), webContentDraftService.listar()
    ]).then(([catalogo, propios]) => {
      if (vigente) { setProyectos(catalogo); setBorradores(propios); }
    }).catch((err: unknown) => { if (vigente) setError(mensajeError(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [puedeAdministrar]);

  function elegirProyecto(id: number) {
    setIdProyecto(id);
    setSeleccionado(null);
    setPropuesta(proyectos.find((p) => p.idProyecto === id)?.visiblePublico ?? false);
    setRevisionPrevisualizada(null);
    setConfirmando(false);
    setError('');
    setMensaje('');
  }

  function elegirBorrador(borrador: BorradorCms) {
    setSeleccionado(borrador);
    setIdProyecto(borrador.idProyecto);
    setPropuesta(borrador.contenidoPendiente.visible_publico === true);
    setRevisionPrevisualizada(null);
    setConfirmando(false);
    setError('');
  }

  async function guardar() {
    if (!puedeAdministrar || !proyecto || !propuestaDiferente || ocupado ||
        (seleccionado && seleccionado.idProyecto !== proyecto.idProyecto)) return;
    setOcupado(true); setError(''); setMensaje(''); setConfirmando(false);
    setRevisionPrevisualizada(null);
    try {
      const borrador = seleccionado
        ? await webContentDraftService.actualizarVisibilidad(
            seleccionado.idBorrador, seleccionado.revisionEdicion, propuesta)
        : await webContentDraftService.crearVisibilidad(proyecto.idProyecto, propuesta);
      setSeleccionado(borrador);
      await recargar();
      setMensaje('Cambio guardado para revisar. La página pública sigue igual.');
    } catch (err: unknown) { setError(mensajeError(err)); }
    finally { setOcupado(false); }
  }

  async function descartar() {
    if (!seleccionado || ocupado || !puedeAdministrar) return;
    setOcupado(true); setError(''); setConfirmando(false); setRevisionPrevisualizada(null);
    try {
      await webContentDraftService.descartarVisibilidad(seleccionado.idBorrador, seleccionado.revisionEdicion);
      setSeleccionado(null);
      await recargar();
      setMensaje('El cambio guardado se eliminó. La página pública no cambió.');
    } catch (err: unknown) { setError(mensajeError(err)); }
    finally { setOcupado(false); }
  }

  async function publicar() {
    if (!seleccionado || !hayCambio || !confirmando || ocupado || !puedePublicar ||
        !PUBLICACION_HABILITADA) return;
    const borrador = seleccionado;
    setOcupado(true); setConfirmando(false); setError('');
    try {
      const respuesta = await webContentDraftService.publicarVisibilidad(borrador);
      const consistente = respuesta.idBorrador === borrador.idBorrador &&
        respuesta.idProyecto === borrador.idProyecto &&
        respuesta.visiblePublico === propuesta &&
        respuesta.revisionAnterior === borrador.revisionBase &&
        respuesta.revisionNueva === borrador.revisionBase + 1;
      setSeleccionado(null);
      setRevisionPrevisualizada(null);
      setBorradores((actual) => actual.filter((b) => b.idBorrador !== borrador.idBorrador));
      setMensaje(consistente
        ? `Cambio publicado: el proyecto ahora está ${respuesta.visiblePublico ? 'visible' : 'oculto'} en la página pública.`
        : 'El servidor respondió, pero la confirmación es inconsistente. Comprueba el estado antes de repetir.');
      try { await recargar(); }
      catch { setError('Publicación confirmada, pero no se pudo actualizar el catálogo. Recarga la página.'); }
    } catch (err: unknown) {
      setRevisionPrevisualizada(null);
      setError(mensajeError(err));
    } finally { setOcupado(false); }
  }

  const buttonClass = 'rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-800 disabled:opacity-50';
  return (
    <section aria-label="Mostrar u ocultar proyectos" className="mt-6 rounded-xl border border-brand-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Otra tarea disponible</p>
      <h2 className="mt-1 text-xl font-semibold text-brand-900">Mostrar u ocultar proyectos en tu página</h2>
      <p className="mt-1 text-sm text-brand-600">
        Elige qué proyectos pueden encontrar los visitantes. Guarda el cambio, comprueba el resultado y
        publícalo cuando esté listo. Aquí no se cambian precios ni datos oficiales.
      </p>
      {!puedeAdministrar && <p className="mt-3 text-sm text-brand-500">Tu usuario no tiene autorización para mostrar u ocultar proyectos.</p>}
      {puedeAdministrar && (
        <div className="mt-4 space-y-4">
          {cargando && <p className="text-sm text-brand-500">Buscando proyectos disponibles...</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="text-sm text-emerald-700">{mensaje}</p>}
          <label className="block text-sm font-medium text-brand-800">
            1. Elige un proyecto
            <select className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2"
              value={idProyecto ?? ''} disabled={ocupado || cargando}
              onChange={(e) => elegirProyecto(Number(e.target.value) || 0)}>
              <option value="">Elige el proyecto que deseas actualizar</option>
              {proyectos.map((p) => (
                <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>
              ))}
            </select>
          </label>
          {proyecto && (
            <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4 text-sm">
              <p className="text-brand-900">Actualmente en la web: <strong>{proyecto.visiblePublico ? 'Visible para todos' : 'Oculto para los visitantes'}</strong></p>
              <p className="mt-1 text-xs text-brand-500">El estado mostrado es el que ven los visitantes ahora mismo.</p>
              <label className="mt-3 block font-medium">
                2. ¿Qué quieres hacer con este proyecto?
                <select className="mt-1 block w-full rounded-md border border-brand-200 px-3 py-2"
                  disabled={ocupado} value={String(propuesta)}
                  onChange={(e) => { setPropuesta(e.target.value === 'true'); setRevisionPrevisualizada(null); setConfirmando(false); }}>
                  <option value="true">Mostrarlo a los visitantes</option>
                  <option value="false">Ocultarlo de la página</option>
                </select>
              </label>
              <button type="button" className="mt-3 rounded-md bg-brand-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={ocupado || !propuestaDiferente || mismaPropuesta}
                onClick={() => void guardar()}>{seleccionado ? 'Guardar nueva decisión' : 'Guardar para revisar'}</button>
              {!propuestaDiferente && <p className="mt-2 text-xs text-brand-500">Elige una opción diferente del estado actual para guardar un cambio.</p>}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-brand-800">Cambios de proyectos pendientes de publicación</h3>
            {borradoresVisibilidad.length === 0 && !cargando && <p className="text-xs text-brand-500">No tienes cambios guardados para mostrar u ocultar proyectos.</p>}
            <div className="mt-2 space-y-2">
              {borradoresVisibilidad.map((b) => (
                <div key={b.idBorrador} className="flex items-center justify-between gap-2 rounded border border-brand-100 p-2 text-sm">
                  <span>{proyectos.find((p) => p.idProyecto === b.idProyecto)?.nombre ?? 'Proyecto'} · {b.contenidoPendiente.visible_publico ? 'Mostrar' : 'Ocultar'}</span>
                  <button className={buttonClass} type="button" disabled={ocupado} onClick={() => elegirBorrador(b)}>Continuar</button>
                </div>
              ))}
            </div>
          </div>
          {seleccionado && proyecto && (
            <section aria-label="Previsualización de visibilidad" className="rounded-md border border-brand-200 p-3">
              <p className="text-sm font-semibold text-brand-900">3. Revisa el cambio guardado</p>
              <p className="mt-1 text-xs text-brand-500">Este cambio aún no se muestra en la página pública.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass} disabled={ocupado || !mismaPropuesta}
                  onClick={() => { setRevisionPrevisualizada(seleccionado.revisionEdicion); setConfirmando(false); }}>
                  Ver antes de publicar
                </button>
                <button type="button" className={buttonClass} disabled={ocupado} onClick={() => void descartar()}>Eliminar cambio</button>
              </div>
              {previsualizado && (
                <div className="mt-3 rounded-md border border-brand-100 p-3 text-sm">
                  <p><strong>{proyecto.codigo} — {proyecto.nombre}</strong></p>
                  <p>Ahora: {proyecto.visiblePublico ? 'Visible' : 'Oculto'}</p>
                  <p>Con tu cambio: <strong>{propuesta ? 'Visible' : 'Oculto'}</strong></p>
                  {!hayCambio && <p className="text-amber-800">La opción elegida es igual al estado actual. No es necesario publicar.</p>}
                  {!PUBLICACION_HABILITADA && <p className="text-amber-800">Todavía no es posible publicar desde este entorno. Pide al administrador que habilite la función.</p>}
                  <button type="button" className={`${buttonClass} mt-3`}
                    disabled={!hayCambio || !puedePublicar || !PUBLICACION_HABILITADA || ocupado}
                    onClick={() => setConfirmando(true)}>Publicar este cambio</button>
                  {confirmando && hayCambio && (
                    <div role="group" aria-label="Confirmación de visibilidad" className="mt-3 rounded border border-amber-300 p-3">
                      <p>¿Confirmas que los visitantes deben ver este proyecto con el nuevo estado?</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className={buttonClass} disabled={ocupado} onClick={() => void publicar()}>Sí, publicar cambio</button>
                        <button type="button" className={buttonClass} disabled={ocupado} onClick={() => setConfirmando(false)}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}

function mensajeError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    if (error.status === 409) return 'El borrador o la versión pública cambió. Recarga y revisa antes de intentar de nuevo.';
    if (error.status === 403) return 'Tu rol no tiene autorización para esta operación.';
    if (error.status === 404) return 'No se encontró el borrador propio o el proyecto sigue inactivo.';
  }
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}
