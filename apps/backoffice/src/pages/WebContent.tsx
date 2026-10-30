import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { webContentDraftService, type BorradorCms } from '../services/webContentDraftService';
import type { SeccionCmsPreview } from '../services/cmsPreview';
import { CmsDraftPreview } from '../components/ui/CmsDraftPreview';
import { WebContentVisibilidad } from '../components/WebContentVisibilidad';
import { webContentDraftImageService, type ImagenBorradorRespuesta } from '../services/webContentDraftImageService';
import { inventariarSlidesInicio } from '../services/cmsHomeSlides';
import { cargarCamposPromo, fusionarCambioSlide, prepararCambioSoloImagen, seccionGuardada, validarCamposPromo, validarSubtituloPromo, type CamposPromoCms } from '../services/cmsSlideDraft';
import { evaluarBorradorPublicable } from '../services/cmsPublicacionTextos';

// IDs verificados en Supabase durante la auditoría del issue.
const PAGINA_INICIO = 1;
const SECCION_HERO = 1;
const CAMPOS_VACIOS: CamposPromoCms = { titulo: '', subtitulo: '', contenido: '' };
// Se activa explícitamente solo tras validar la migración 36 y autorizar el despliegue.
const PUBLICACION_TEXTOS_HABILITADA = import.meta.env.VITE_CMS_PUBLICACION_TEXTOS_HABILITADA === 'true';
// Flag separado: el backend también exige CMS_PUBLICACION_IMAGENES_HABILITADA=true.
const PUBLICACION_IMAGENES_HABILITADA = import.meta.env.VITE_CMS_PUBLICACION_IMAGENES_HABILITADA === 'true';

export function WebContent() {
  const { can } = useAuth();
  const [borradores, setBorradores] = useState<BorradorCms[]>([]);
  const [seleccionado, setSeleccionado] = useState<BorradorCms | null>(null);
  const [previsualizando, setPrevisualizando] = useState(false);
  const [revisionPrevisualizada, setRevisionPrevisualizada] = useState<number | null>(null);
  const [confirmandoPublicacion, setConfirmandoPublicacion] = useState(false);
  const [imagenesPendientes, setImagenesPendientes] = useState<ImagenBorradorRespuesta[]>([]);
  const [seccionesInicio, setSeccionesInicio] = useState<SeccionCmsPreview[] | null>(null);
  const [cargandoSeccion, setCargandoSeccion] = useState(true);
  const [errorSeccion, setErrorSeccion] = useState('');
  const [slideActivo, setSlideActivo] = useState<1 | 2 | 3>(1);
  const [camposPromo, setCamposPromo] = useState<CamposPromoCms>(CAMPOS_VACIOS);
  const [ocupado, setOcupado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const puedeEditar = can('web_content.edit');
  const puedePublicar = can('web_content.publish');

  useEffect(() => {
    let vigente = true;
    webContentDraftService.listar()
      .then((datos) => { if (vigente) setBorradores(datos); })
      .catch((err: unknown) => { if (vigente) setError(describirError(err)); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    let vigente = true;
    webContentDraftService.listarSecciones(PAGINA_INICIO)
      .then((secciones) => {
        if (!vigente) return;
        setSeccionesInicio(secciones);
        if (!secciones.some((item) => item.idSeccion === SECCION_HERO && item.codigo === 'HERO_PRINCIPAL' && item.activo)) {
          throw new Error('La sección HERO_PRINCIPAL no está disponible.');
        }
      })
      .catch((err: unknown) => { if (vigente) setErrorSeccion(describirError(err)); })
      .finally(() => { if (vigente) setCargandoSeccion(false); });
    return () => { vigente = false; };
  }, []);

  async function recargar() {
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setImagenesPendientes([]);
    setConfirmandoPublicacion(false);
    const datos = await webContentDraftService.listar();
    setBorradores(datos);
    setSeleccionado((actual) => actual
      ? datos.find((item) => item.idBorrador === actual.idBorrador) ?? null
      : null);
    return datos;
  }

  async function ejecutar(accion: () => Promise<BorradorCms>, exito: string) {
    setError('');
    setMensaje('');
    setOcupado(true);
    try {
      const resultado = await accion();
      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setConfirmandoPublicacion(false);
      await recargar();
      setSeleccionado(resultado.estado === 'EN_EDICION' ? resultado : null);
      setMensaje(exito);
    } catch (err: unknown) {
      setError(describirError(err));
    } finally {
      setOcupado(false);
    }
  }

  const pruebasInicio = borradores.filter(
    (borrador) => borrador.tipoObjetivo === 'PAGINA' &&
      borrador.idPagina === PAGINA_INICIO && borrador.estado === 'EN_EDICION'
  );
  const inventarioSlides = inventariarSlidesInicio(seccionesInicio);
  const slide = inventarioSlides.find((item) => item.numero === slideActivo);
  const seccionActiva = seccionesInicio?.find((item) => item.idSeccion === slide?.idSeccionCms) ?? null;
  const errorCampos = slideActivo === 1
    ? validarCamposPromo(camposPromo) : validarSubtituloPromo(camposPromo.subtitulo);
  const editable = Boolean(puedeEditar && seccionActiva && slide?.estado === 'EDITOR_CMS');
  const tieneCambioGuardado = Boolean(seleccionado && seccionActiva &&
    seccionGuardada(seleccionado.contenidoPendiente, seccionActiva.idSeccion));
  const imagenesVerificadas = PUBLICACION_IMAGENES_HABILITADA && previsualizando &&
    revisionPrevisualizada === seleccionado?.revisionEdicion
      ? new Set(imagenesPendientes.map((imagen) => imagen.idSeccion))
      : new Set<number>();
  const evaluacionPublicacion = evaluarBorradorPublicable(
    seleccionado, seccionesInicio, PAGINA_INICIO, imagenesVerificadas);
  const habilitarConfirmacion = Boolean((PUBLICACION_TEXTOS_HABILITADA || PUBLICACION_IMAGENES_HABILITADA) && puedePublicar &&
    seleccionado && previsualizando && revisionPrevisualizada === seleccionado.revisionEdicion &&
    evaluacionPublicacion.valido && !ocupado &&
    (PUBLICACION_IMAGENES_HABILITADA || imagenesPendientes.length === 0));

  useEffect(() => {
    if (!seccionActiva) { setCamposPromo(CAMPOS_VACIOS); return; }
    try {
      setCamposPromo(cargarCamposPromo(seccionActiva, seleccionado?.contenidoPendiente));
    } catch (err: unknown) { setError(describirError(err)); }
  }, [seccionActiva?.idSeccion, seleccionado?.idBorrador]);

  function cambiarSlide(numero: 1 | 2 | 3) {
    setSlideActivo(numero);
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setImagenesPendientes([]);
    setConfirmandoPublicacion(false);
    setError('');
    setMensaje('');
  }

  function guardarSlide(crear: boolean) {
    if (!seccionActiva || !editable || errorCampos) return;
    const ejecutarCambio = () => {
      const cambios = fusionarCambioSlide(
        crear ? null : seleccionado?.contenidoPendiente ?? null,
        seccionActiva.idSeccion, camposPromo, slideActivo !== 1
      );
      return crear
        ? webContentDraftService.crearPagina(PAGINA_INICIO, cambios)
        : webContentDraftService.actualizarPagina(
          seleccionado!.idBorrador, seleccionado!.revisionEdicion, cambios
        );
    };
    void ejecutar(ejecutarCambio, crear
      ? 'Borrador creado. La página pública no ha cambiado.'
      : 'Slide guardado. Los cambios de las otras diapositivas se conservaron.');
  }
  function prepararSoloImagen() {
    if (!seccionActiva || !editable || tieneCambioGuardado || ocupado) return;
    void ejecutar(() => {
      const secciones = prepararCambioSoloImagen(
        seleccionado?.contenidoPendiente ?? null, seccionActiva.idSeccion);
      return seleccionado
        ? webContentDraftService.actualizarPagina(
            seleccionado.idBorrador, seleccionado.revisionEdicion, secciones)
        : webContentDraftService.crearPagina(PAGINA_INICIO, secciones);
    }, 'Sección preparada para imagen. Previsualiza y guarda una imagen privada antes de publicar.');
  }

  async function previsualizarBorrador() {
    if (!seleccionado || !seccionActiva || ocupado) return;
    setOcupado(true); setError(''); setConfirmandoPublicacion(false);
    setPrevisualizando(false); setRevisionPrevisualizada(null);
    try {
      const imagenes = await webContentDraftImageService.listar(seleccionado.idBorrador);
      if (imagenes.some((i) => i.revisionEdicion !== seleccionado.revisionEdicion)) {
        throw new Error('El borrador cambió al cargar las imágenes. Recarga antes de publicar.');
      }
      setImagenesPendientes(imagenes);
      setPrevisualizando(true);
      setRevisionPrevisualizada(seleccionado.revisionEdicion);
    } catch (err: unknown) {
      setImagenesPendientes([]);
      setError(describirError(err));
    } finally { setOcupado(false); }
  }

  async function publicarTextos() {
    if (!habilitarConfirmacion || !confirmandoPublicacion || !seleccionado ||
        !evaluacionPublicacion.valido) return;
    const borradorConfirmado = seleccionado;
    setOcupado(true);
    setError('');
    setMensaje('');
    setConfirmandoPublicacion(false);
    try {
      const respuesta = PUBLICACION_IMAGENES_HABILITADA
        ? await webContentDraftService.publicarContenido(borradorConfirmado)
        : await webContentDraftService.publicarTextos(borradorConfirmado);
      const confirmacionConsistente = respuesta.idBorrador === borradorConfirmado.idBorrador &&
        respuesta.idPagina === PAGINA_INICIO &&
        respuesta.revisionAnterior === borradorConfirmado.revisionBase &&
        respuesta.revisionNueva === borradorConfirmado.revisionBase + 1;
      // La publicación ya ocurrió: una falla de refresco NO debe presentarse como error de publicación.
      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setSeleccionado(null);
      setBorradores((actuales) => actuales.filter((item) => item.idBorrador !== borradorConfirmado.idBorrador));
      setMensaje(confirmacionConsistente
        ? `${PUBLICACION_IMAGENES_HABILITADA ? 'Contenido' : 'Textos'} publicado. Revisión pública ${respuesta.revisionNueva} · Historial #${respuesta.idHistorial}.`
        : 'El servidor respondió a la publicación, pero la confirmación es inconsistente. Verifica el historial antes de repetir.');
      try {
        const [datos, secciones] = await Promise.all([
          webContentDraftService.listar(), webContentDraftService.listarSecciones(PAGINA_INICIO)
        ]);
        setBorradores(datos);
        setSeccionesInicio(secciones);
      } catch {
        setError('La publicación fue confirmada, pero no se pudo refrescar la vista. Recarga antes de editar de nuevo.');
      }
    } catch (err: unknown) {
      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setError(describirErrorPublicacion(err));
    } finally {
      setOcupado(false);
    }
  }
  const inputClass = 'w-full rounded-md border border-brand-200 px-3 py-2 text-sm text-brand-900';
  const buttonClass = 'rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-800 disabled:opacity-50';

  return (
    <div>
      <PageHeader title="Gestión de contenido web" description="Administración del contenido promocional de la página pública." />
      <section aria-label="Estado de las tres diapositivas de Inicio" className="mb-5 rounded-lg border border-brand-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-brand-900">Diapositivas actuales de Inicio</h2>
        <p className="mt-1 text-xs text-brand-500">
          Solo se editan textos e imágenes promocionales en borradores privados. Los datos comerciales oficiales no se modifican.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {inventarioSlides.map((slide) => (
            <div key={slide.clave} className="rounded-md border border-brand-100 bg-brand-50/30 p-3">
              <p className="text-xs font-semibold text-brand-500">Slide {slide.numero}</p>
              <h3 className="mt-1 text-sm font-semibold text-brand-900">{slide.nombre}</h3>
              <p className={`mt-2 text-xs font-medium ${slide.estado === 'EDITOR_CMS' ? 'text-emerald-700' : 'text-amber-800'}`}>
                {slide.estado === 'EDITOR_CMS' ? 'Administrable mediante borrador privado' : 'Solo lectura · integración pendiente'}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-brand-600">{slide.descripcion}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-brand-500">
          Las secciones de los slides 2 y 3 están ocultas en la API pública y su contenido actual continúa definido en React.
        </p>
      </section>
      <Card>
        <CardHeader
          title="Edición privada de las diapositivas de Inicio"
          description="Edita y previsualiza un borrador privado. La publicación requiere autorización y confirmación."
        />
        <CardBody>
          <p className="mb-4 text-[13px] leading-relaxed text-brand-500">
            Los datos comerciales de proyectos y financiamiento siguen bajo responsabilidad de los roles autorizados.
            La publicación solo se habilita con su correspondiente flag y migraciones revisadas.
            Las imágenes nuevas requieren el flujo de confirmación con Storage público.
          </p>
          {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
          {mensaje && <p role="status" className="mb-3 text-sm text-emerald-700">{mensaje}</p>}
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-semibold text-brand-800">Diapositiva a editar</legend>
            <div className="flex flex-wrap gap-2">
              {inventarioSlides.map((item) => (
                <button key={item.numero} type="button"
                  className={`rounded-md border px-3 py-2 text-sm ${slideActivo === item.numero
                    ? 'border-brand-800 bg-brand-900 text-white' : buttonClass}`}
                  disabled={item.estado !== 'EDITOR_CMS' || ocupado}
                  aria-pressed={slideActivo === item.numero}
                  onClick={() => cambiarSlide(item.numero)}>
                  Slide {item.numero} · {item.nombre}
                </button>
              ))}
            </div>
          </fieldset>
          {slideActivo !== 1 && <p className="mb-3 text-xs text-amber-800">
            Los datos oficiales del proyecto y el financiamiento no se editan aquí. Esta sección CMS
            permanece oculta y no sustituye los textos comerciales actuales de React.
          </p>}
          {slideActivo !== 1 && <p className="mb-3 text-xs text-brand-600">
            Solo el subtítulo promocional puede guardarse y publicarse en los slides 2 y 3.
            Los títulos y descripciones comerciales no se editan aquí.
          </p>}
          <div className="grid gap-3">
            {(slideActivo === 1 ? ['titulo', 'subtitulo', 'contenido'] as const : ['subtitulo'] as const).map((campo) => (
              <label key={campo} className="block text-sm font-medium text-brand-800">
                {campo === 'titulo' ? 'Título promocional' : campo === 'subtitulo'
                  ? 'Subtítulo promocional' : 'Descripción promocional'}
                {campo === 'contenido' ? <textarea rows={3} className={`mt-1 ${inputClass}`}
                  maxLength={500} value={camposPromo[campo]}
                  disabled={!editable || ocupado}
                  onChange={(event) => { setCamposPromo((actual) => ({ ...actual, [campo]: event.target.value })); setPrevisualizando(false); setConfirmandoPublicacion(false); }} />
                  : <input type="text" className={`mt-1 ${inputClass}`}
                    maxLength={campo === 'titulo' ? 180 : 255} value={camposPromo[campo]}
                    disabled={!editable || ocupado}
                    onChange={(event) => { setCamposPromo((actual) => ({ ...actual, [campo]: event.target.value })); setPrevisualizando(false); setConfirmandoPublicacion(false); }} />}
              </label>
            ))}
          </div>
          {errorCampos && <p role="status" className="mt-2 text-xs text-amber-800">{errorCampos}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={buttonClass}
              disabled={!editable || ocupado || Boolean(errorCampos)}
              onClick={() => guardarSlide(true)}>
              Crear borrador
            </button>
            <button type="button" className={buttonClass}
              disabled={!editable || ocupado || !seleccionado || Boolean(errorCampos)}
              onClick={() => guardarSlide(false)}>
              Guardar slide seleccionado
            </button>
            <button type="button" className={buttonClass}
              disabled={!editable || ocupado || tieneCambioGuardado}
              onClick={prepararSoloImagen}>
              {seleccionado ? 'Añadir slide solo imagen' : 'Crear borrador solo imagen'}
            </button>
            <button
              type="button" className={buttonClass}
              disabled={!puedeEditar || ocupado || !seleccionado}
              onClick={() => {
                if (!seleccionado) return;
                void ejecutar(
                  () => webContentDraftService.descartarPagina(
                    seleccionado.idBorrador, seleccionado.revisionEdicion
                  ),
                  'Borrador descartado sin publicar.'
                );
              }}
            >Descartar seleccionado</button>
            <button
              type="button" className={buttonClass}
              disabled={ocupado || cargando}
              onClick={() => {
                setError('');
                setMensaje('');
                setOcupado(true);
                void recargar().catch((err: unknown) => setError(describirError(err)))
                  .finally(() => setOcupado(false));
              }}
            >Recargar lista</button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button" className={buttonClass}
              disabled={ocupado || cargandoSeccion || !seleccionado || !seccionActiva || !tieneCambioGuardado || seleccionado.estado !== 'EN_EDICION'}
              onClick={() => void previsualizarBorrador()}
            >Previsualizar borrador guardado</button>
            <span className="text-xs text-brand-500">
              Prepara un borrador para este slide, con textos o solo imagen. Dentro de la previsualización debes guardar la imagen privada antes de publicar.
            </span>
          </div>
          {errorSeccion && <p role="alert" className="mt-3 text-sm text-rose-700">{errorSeccion}</p>}
          <p className="mt-3 text-xs text-brand-400">
            Los borradores son privados para su autor. La publicación de imágenes solo se permite
            cuando el servidor y el Frontend habiliten el flujo de contenido completo.
            Antes de descartar un borrador con imagen, retira la imagen privada: la limpieza periódica
            puede estar desactivada en este entorno.
          </p>
          <div className="mt-6 border-t border-brand-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-900">Borradores propios en edición — Inicio</h3>
            {cargando ? <p className="text-sm text-brand-400">Cargando...</p> : null}
            {!cargando && pruebasInicio.length === 0 ? (
              <p className="text-sm text-brand-400">No hay borradores pendientes para Inicio.</p>
            ) : null}
            <div className="space-y-2">
              {pruebasInicio.map((borrador) => (
                <div key={borrador.idBorrador}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-100 px-3 py-2">
                  <span className="text-sm text-brand-700">
                    #{borrador.idBorrador} · Revisión {borrador.revisionEdicion}
                    {seleccionado?.idBorrador === borrador.idBorrador ? ' · Seleccionado' : ''}
                  </span>
                  <button
                    type="button" className={buttonClass} disabled={ocupado || !puedeEditar}
                    onClick={() => {
                      setSeleccionado(borrador);
                      setPrevisualizando(false);
                      setRevisionPrevisualizada(null);
                      setConfirmandoPublicacion(false);
                      if (seccionActiva) {
                        try { setCamposPromo(cargarCamposPromo(seccionActiva, borrador.contenidoPendiente)); }
                        catch (err: unknown) { setError(describirError(err)); }
                      }
                    }}
                  >Seleccionar</button>
                </div>
              ))}
            </div>
          </div>
          {previsualizando && seleccionado && seccionActiva && (
            <CmsDraftPreview
              key={`${seleccionado.idBorrador}-${seccionActiva.idSeccion}`}
              seccion={seccionActiva}
              borrador={seleccionado}
              cerrar={() => { setPrevisualizando(false); setConfirmandoPublicacion(false); }}
              puedeEditar={puedeEditar}
              cambioRevision={(revision) => {
                setPrevisualizando(false);
                setRevisionPrevisualizada(null);
                setConfirmandoPublicacion(false);
                const idBorrador = seleccionado.idBorrador;
                setSeleccionado((actual) => actual?.idBorrador === idBorrador
                  ? { ...actual, revisionEdicion: revision } : actual);
                setBorradores((actuales) => actuales.map((item) =>
                  item.idBorrador === idBorrador ? { ...item, revisionEdicion: revision } : item
                ));
              }}
            />
          )}
          {seleccionado && (
            <section aria-label="Publicación de textos del borrador" className="mt-5 rounded-lg border border-brand-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-brand-900">Publicar cambios del borrador</h3>
              <p className="mt-1 text-xs text-brand-600">
                Publicación directa después de previsualizar, solo para usuarios con web_content.publish.
                La ruta de contenido completo publica también las imágenes privadas verificadas del mismo borrador.
                Nunca modifica precios, datos comerciales ni visibilidad de proyectos.
              </p>
              {!PUBLICACION_TEXTOS_HABILITADA && !PUBLICACION_IMAGENES_HABILITADA && <p role="status" className="mt-2 text-xs text-amber-800">
                Publicación deshabilitada hasta aprobar las migraciones y los permisos del entorno de destino.
              </p>}
              {!puedePublicar && <p className="mt-2 text-xs text-brand-500">Tu rol no tiene permiso para publicar.</p>}
              {!evaluacionPublicacion.valido && <p role="alert" className="mt-2 text-xs text-amber-800">
                {evaluacionPublicacion.motivo}
              </p>}
              {previsualizando && evaluacionPublicacion.valido && (
                <div className="mt-3 space-y-3">
                  <h4 className="text-xs font-semibold text-brand-800">Resumen de los textos y fondos de este borrador</h4>
                  <div className="rounded border border-brand-100 p-3 text-xs">
                    <p className="font-semibold text-brand-800">Imágenes privadas pendientes: {imagenesPendientes.length}</p>
                    {imagenesPendientes.map((imagen) => (
                      <p key={imagen.idSeccion} className="mt-1 text-brand-600">
                        Sección #{imagen.idSeccion} · {imagen.mimeType} · {imagen.tamanoBytes ?? 0} bytes
                      </p>
                    ))}
                    {imagenesPendientes.length > 0 && !PUBLICACION_IMAGENES_HABILITADA && (
                      <p className="mt-2 text-amber-800">
                        No puedes publicar este borrador con la ruta solo de textos. Falta activar el publicador de imágenes.
                      </p>
                    )}
                  </div>
                  {evaluacionPublicacion.secciones.map((seccion) => (
                    <div key={seccion.idSeccion} className="rounded border border-brand-100 p-3 text-xs">
                      <p className="font-semibold text-brand-800">{seccion.codigo} · Sección #{seccion.idSeccion}</p>
                      {seccion.textos.map((texto) => (
                        <div key={texto.campo} className="mt-2 break-words">
                          <p className="font-medium text-brand-800">{texto.campo}</p>
                          <p className="text-brand-500">Actual: {texto.actual || '(vacío)'}</p>
                          <p className="text-brand-800">Nuevo: {texto.nuevo || '(vacío)'}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                  <p className="text-xs text-brand-500">
                    Borrador #{seleccionado.idBorrador} · Revisión editorial {seleccionado.revisionEdicion} ·
                    Revisión pública esperada {seleccionado.revisionBase}.
                    Si la versión pública cambió, el backend rechazará la publicación.
                  </p>
                  {evaluacionPublicacion.secciones.some((item) => item.codigo !== 'HERO_PRINCIPAL') && (
                    <p className="text-xs text-amber-800">
                      Las secciones CMS de slides 2 y 3 siguen ocultas; publicar sus subtítulos no cambia
                      el carrusel React hasta completar la integración pública correspondiente.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClass}
                  disabled={!habilitarConfirmacion}
                  onClick={() => setConfirmandoPublicacion(true)}>
                  {PUBLICACION_IMAGENES_HABILITADA ? 'Publicar textos y fondos' : 'Publicar textos'}
                </button>
              </div>
              {confirmandoPublicacion && habilitarConfirmacion && (
                <div role="group" aria-label="Confirmación de publicación" className="mt-3 rounded-md border border-amber-300 p-3">
                  <p className="text-xs font-semibold text-brand-900">¿Confirmas publicar los cambios autorizados del borrador?</p>
                  <p className="mt-1 text-xs text-brand-600">
                    {PUBLICACION_IMAGENES_HABILITADA
                      ? 'Se publicarán los textos autorizados y todos los fondos privados de este borrador. Solo los slides activos y visibles se mostrarán públicamente.'
                      : 'Se publicarán solo textos. Si el borrador contiene imágenes privadas, el servidor rechazará la operación.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={ocupado} className={buttonClass}
                      onClick={() => void publicarTextos()}>Confirmar publicación</button>
                    <button type="button" disabled={ocupado} className={buttonClass}
                      onClick={() => setConfirmandoPublicacion(false)}>Cancelar</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </CardBody>
      </Card>
      <WebContentVisibilidad />
    </div>
  );
}

function describirError(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
    return 'El borrador cambió en otra sesión. Recarga la lista y vuelve a seleccionarlo.';
  }
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}

function describirErrorPublicacion(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error) {
    switch (error.status) {
      case 400: return 'La solicitud o el contenido del borrador no cumple el contrato de publicación.';
      case 401: return 'La sesión expiró. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para publicar este contenido.';
      case 404: return 'No se encontró el borrador propio. Recarga la lista.';
      case 409: return 'El borrador, las imágenes pendientes o la versión pública generan un conflicto. Recarga y revisa antes de intentar de nuevo.';
    }
  }
  return error instanceof Error ? error.message : 'No fue posible confirmar la publicación.';
}
