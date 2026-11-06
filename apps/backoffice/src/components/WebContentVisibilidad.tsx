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
    setPropuesta(!(proyectos.find((p) => p.idProyecto === id)?.visiblePublico ?? false));
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
    if (!puedeAdministrar || !proyecto || ocupado ||
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
      setMensaje('Borrador guardado. La visibilidad pública no ha cambiado.');
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
      setMensaje('Borrador descartado; no se publicaron cambios.');
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
        ? `Visibilidad publicada; revisión ${respuesta.revisionNueva}. Historial #${respuesta.idHistorial}.`
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
    <section aria-label="Visibilidad pública de proyectos" className="mt-6 rounded-lg border border-brand-200 bg-white p-5">
      <h2 className="text-base font-semibold text-brand-900">Visibilidad pública de proyectos existentes</h2>
      <p className="mt-1 text-sm text-brand-600">
        Marketing puede mostrar u ocultar proyectos registrados y activos, pero no cambiar sus datos oficiales.
        Los cambios requieren borrador, previsualización y publicación expresa.
      </p>
      {!puedeAdministrar && <p className="mt-3 text-sm text-brand-500">No tienes permiso para gestionar la visibilidad de proyectos.</p>}
      {puedeAdministrar && (
        <div className="mt-4 space-y-4">
          {cargando && <p className="text-sm text-brand-500">Cargando catálogo...</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {mensaje && <p role="status" className="text-sm text-emerald-700">{mensaje}</p>}
          <label className="block text-sm font-medium text-brand-800">
            Proyecto oficial activo
            <select className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2"
              value={idProyecto ?? ''} disabled={ocupado || cargando}
              onChange={(e) => elegirProyecto(Number(e.target.value) || 0)}>
              <option value="">Selecciona un proyecto</option>
              {proyectos.map((p) => (
                <option key={p.idProyecto} value={p.idProyecto}>{p.codigo} — {p.nombre}</option>
              ))}
            </select>
          </label>
          {proyecto && (
            <div className="rounded-md border border-brand-100 p-3 text-sm">
              <p>Estado público actual: <strong>{proyecto.visiblePublico ? 'Visible' : 'Oculto'}</strong></p>
              <p className="text-xs text-brand-500">Revisión publicada: {proyecto.revisionPublicada}</p>
              <label className="mt-3 block font-medium">
                Propuesta
                <select className="mt-1 block w-full rounded-md border border-brand-200 px-3 py-2"
                  disabled={ocupado} value={String(propuesta)}
                  onChange={(e) => { setPropuesta(e.target.value === 'true'); setRevisionPrevisualizada(null); setConfirmando(false); }}>
                  <option value="true">Mostrar públicamente</option>
                  <option value="false">Ocultar públicamente</option>
                </select>
              </label>
              <button type="button" className={`${buttonClass} mt-3`} disabled={ocupado}
                onClick={() => void guardar()}>{seleccionado ? 'Actualizar borrador' : 'Crear borrador'}</button>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-brand-800">Mis borradores de visibilidad</h3>
            {borradoresVisibilidad.length === 0 && !cargando && <p className="text-xs text-brand-500">Sin borradores en edición.</p>}
            <div className="mt-2 space-y-2">
              {borradoresVisibilidad.map((b) => (
                <div key={b.idBorrador} className="flex items-center justify-between gap-2 rounded border border-brand-100 p-2 text-sm">
                  <span>#{b.idBorrador} · Proyecto {b.idProyecto} · Revisión {b.revisionEdicion}</span>
                  <button className={buttonClass} type="button" disabled={ocupado} onClick={() => elegirBorrador(b)}>Seleccionar</button>
                </div>
              ))}
            </div>
          </div>
          {seleccionado && proyecto && (
            <section aria-label="Previsualización de visibilidad" className="rounded-md border border-brand-200 p-3">
              <p className="text-sm font-semibold text-brand-900">Borrador #{seleccionado.idBorrador}</p>
              <p className="mt-1 text-xs text-brand-500">Revisión editorial {seleccionado.revisionEdicion}, base pública {seleccionado.revisionBase}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass} disabled={ocupado || !mismaPropuesta}
                  onClick={() => { setRevisionPrevisualizada(seleccionado.revisionEdicion); setConfirmando(false); }}>
                  Previsualizar borrador guardado
                </button>
                <button type="button" className={buttonClass} disabled={ocupado} onClick={() => void descartar()}>Descartar borrador</button>
              </div>
              {previsualizado && (
                <div className="mt-3 rounded-md border border-brand-100 p-3 text-sm">
                  <p><strong>{proyecto.codigo} — {proyecto.nombre}</strong></p>
                  <p>Antes: {proyecto.visiblePublico ? 'Visible' : 'Oculto'}</p>
                  <p>Después: <strong>{propuesta ? 'Visible' : 'Oculto'}</strong></p>
                  {!hayCambio && <p className="text-amber-800">No hay cambio publicable respecto del estado actual.</p>}
                  {!PUBLICACION_HABILITADA && <p className="text-amber-800">Publicación deshabilitada hasta completar validación y migración de seguridad.</p>}
                  <button type="button" className={`${buttonClass} mt-3`}
                    disabled={!hayCambio || !puedePublicar || !PUBLICACION_HABILITADA || ocupado}
                    onClick={() => setConfirmando(true)}>Publicar visibilidad</button>
                  {confirmando && hayCambio && (
                    <div role="group" aria-label="Confirmación de visibilidad" className="mt-3 rounded border border-amber-300 p-3">
                      <p>¿Confirmas cambiar la visibilidad pública de este proyecto?</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" className={buttonClass} disabled={ocupado} onClick={() => void publicar()}>Confirmar publicación</button>
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
