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
import {
  cargarCamposPromo,
  elegirSlideInicialBorrador,
  identificarSlidesBorrador,
  validarCambioSlideBorrador,
  existenCambiosReales,
  fusionarCambioSlide,
  prepararCambioSoloImagen,
  seccionGuardada,
  validarCamposPromo,
  validarSubtituloPromo,
  type CamposPromoCms
} from '../services/cmsSlideDraft';
import { evaluarBorradorPublicable } from '../services/cmsPublicacionTextos';

const PAGINA_INICIO = 1;
const SECCION_HERO = 1;

const CAMPOS_VACIOS: CamposPromoCms = {
  titulo: '',
  subtitulo: '',
  contenido: ''
};

const MAXIMOS_CAMPOS = {
  titulo: 180,
  subtitulo: 255,
  contenido: 500
} as const;

type CampoPromo = keyof CamposPromoCms;

const PUBLICACION_TEXTOS_HABILITADA =
  import.meta.env.VITE_CMS_PUBLICACION_TEXTOS_HABILITADA === 'true';

const PUBLICACION_IMAGENES_HABILITADA =
  import.meta.env.VITE_CMS_PUBLICACION_IMAGENES_HABILITADA === 'true';

/**
 * Validación individual para mostrar errores debajo de cada campo.
 */
function validarCampoIndividual(
  campo: CampoPromo,
  valor: string
): string | null {

  if (campo === 'titulo' && !valor.trim()) {
    return 'Este campo es obligatorio. Escribe un título.';
  }

  if (valor.length > MAXIMOS_CAMPOS[campo]) {
    return `Has superado el límite de ${MAXIMOS_CAMPOS[campo]} caracteres.`;
  }

  if (/[<>]/.test(valor)) {
    return 'No se permiten los caracteres < ni >.';
  }

  return null;
}

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

  // =========================================================
  // CARGA INICIAL
  // =========================================================

  useEffect(() => {
    let vigente = true;

    webContentDraftService.listar()
      .then((datos) => {
        if (vigente) setBorradores(datos);
      })
      .catch((err: unknown) => {
        if (vigente) setError(describirError(err));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;

    webContentDraftService.listarSecciones(PAGINA_INICIO)
      .then((secciones) => {
        if (!vigente) return;

        setSeccionesInicio(secciones);

        if (!secciones.some(
          (item) =>
            item.idSeccion === SECCION_HERO &&
            item.codigo === 'HERO_PRINCIPAL' &&
            item.activo
        )) {
          throw new Error('La sección principal de Inicio no está disponible.');
        }
      })
      .catch((err: unknown) => {
        if (vigente) setErrorSeccion(describirError(err));
      })
      .finally(() => {
        if (vigente) setCargandoSeccion(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  // =========================================================
  // RECARGA Y OPERACIONES
  // =========================================================

  async function recargar() {
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setImagenesPendientes([]);
    setConfirmandoPublicacion(false);

    const datos = await webContentDraftService.listar();

    setBorradores(datos);

    setSeleccionado((actual) =>
      actual
        ? datos.find(
          (item) => item.idBorrador === actual.idBorrador
        ) ?? null
        : null
    );

    return datos;
  }

  async function ejecutar(
    accion: () => Promise<BorradorCms>,
    exito: string
  ) {
    setError('');
    setMensaje('');
    setOcupado(true);

    try {
      const resultado = await accion();

      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setConfirmandoPublicacion(false);

      await recargar();

      setSeleccionado(
        resultado.estado === 'EN_EDICION' ? resultado : null
      );

      setMensaje(exito);

    } catch (err: unknown) {
      setError(describirError(err));
    } finally {
      setOcupado(false);
    }
  }

  // =========================================================
  // INFORMACIÓN DE SLIDES Y BORRADORES
  // =========================================================

  const pruebasInicio = borradores.filter(
    (borrador) =>
      borrador.tipoObjetivo === 'PAGINA' &&
      borrador.idPagina === PAGINA_INICIO &&
      borrador.estado === 'EN_EDICION'
  );

  const inventarioSlides = inventariarSlidesInicio(seccionesInicio);

  const slidesDelBorrador = seleccionado
    ? identificarSlidesBorrador(seleccionado, inventarioSlides, PAGINA_INICIO)
    : [];

  const borradorIncluyeSlideActivo =
    !seleccionado || slidesDelBorrador.includes(slideActivo);

  const slide = inventarioSlides.find(
    (item) => item.numero === slideActivo
  );

  const seccionActiva = seccionesInicio?.find(
    (item) => item.idSeccion === slide?.idSeccionCms
  ) ?? null;

  const errorCampos = slideActivo === 1
    ? validarCamposPromo(camposPromo)
    : validarSubtituloPromo(camposPromo.subtitulo);

  const editable = Boolean(
    puedeEditar &&
    seccionActiva &&
    slide?.estado === 'EDITOR_CMS' &&
    borradorIncluyeSlideActivo
  );

  const tieneCambioGuardado = Boolean(
    seleccionado &&
    seccionActiva &&
    borradorIncluyeSlideActivo &&
    seccionGuardada(
      seleccionado.contenidoPendiente,
      seccionActiva.idSeccion
    )
  );

  // Recuperar los valores actualmente guardados para comparar.
  let camposGuardados: CamposPromoCms = CAMPOS_VACIOS;

  if (seccionActiva) {
    try {
      camposGuardados = cargarCamposPromo(
        seccionActiva,
        seleccionado?.contenidoPendiente
      );
    } catch {
      camposGuardados = {
        titulo: seccionActiva.titulo ?? '',
        subtitulo: seccionActiva.subtitulo ?? '',
        contenido: seccionActiva.contenido ?? ''
      };
    }
  }

  const camposEditables: CampoPromo[] = slideActivo === 1
    ? ['titulo', 'subtitulo', 'contenido']
    : ['subtitulo'];

  const hayCambiosFormulario = existenCambiosReales(
    camposPromo,
    camposGuardados,
    camposEditables
  );

  // La comprobación de una imagen privada no depende de que su publicación
  // esté habilitada. La autorización para publicar se valida por separado.
  const imagenesVerificadas =
    previsualizando &&
      revisionPrevisualizada === seleccionado?.revisionEdicion
      ? new Set(imagenesPendientes.map((imagen) => imagen.idSeccion))
      : new Set<number>();

  const evaluacionPublicacion = evaluarBorradorPublicable(
    seleccionado,
    seccionesInicio,
    PAGINA_INICIO,
    imagenesVerificadas
  );

  const habilitarConfirmacion = Boolean(
    (
      PUBLICACION_TEXTOS_HABILITADA ||
      PUBLICACION_IMAGENES_HABILITADA
    ) &&
    puedePublicar &&
    seleccionado &&
    previsualizando &&
    revisionPrevisualizada === seleccionado.revisionEdicion &&
    evaluacionPublicacion.valido &&
    !hayCambiosFormulario &&
    !ocupado &&
    (
      PUBLICACION_IMAGENES_HABILITADA ||
      imagenesPendientes.length === 0
    )
  );

  // =========================================================
  // CARGA DE CAMPOS DEL SLIDE
  // =========================================================

  useEffect(() => {
    if (!seccionActiva) {
      setCamposPromo(CAMPOS_VACIOS);
      return;
    }

    try {
      setCamposPromo(
        cargarCamposPromo(
          seccionActiva,
          seleccionado?.contenidoPendiente
        )
      );
    } catch (err: unknown) {
      setError(describirError(err));
    }
  }, [
    seccionActiva,
    seleccionado?.idBorrador,
    seleccionado?.contenidoPendiente
  ]);

  // =========================================================
  // CAMBIO DE SLIDE
  // =========================================================

  function cambiarSlide(numero: 1 | 2 | 3) {
    if (ocupado || numero === slideActivo) return;

    const errorCambio = validarCambioSlideBorrador(
      numero,
      seleccionado ? slidesDelBorrador : null,
      hayCambiosFormulario
    );

    if (errorCambio) {
      setError(errorCambio);
      return;
    }

    const slideDestino = inventarioSlides.find(item => item.numero === numero);
    const seccionDestino = seccionesInicio?.find(
      item => item.idSeccion === slideDestino?.idSeccionCms
    );

    if (slideDestino?.estado !== 'EDITOR_CMS' || !seccionDestino) {
      setError(`El Slide ${numero} no está disponible para edición.`);
      return;
    }

    try {
      // Evita mostrar durante un render los campos del slide anterior.
      setCamposPromo(cargarCamposPromo(
        seccionDestino,
        seleccionado?.contenidoPendiente
      ));
    } catch (err: unknown) {
      setError(describirError(err));
      return;
    }

    setSlideActivo(numero);
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setImagenesPendientes([]);
    setConfirmandoPublicacion(false);
    setError('');
    setMensaje('');
  }

  function liberarSeleccionBorrador() {
    if (!seleccionado || ocupado) return;

    if (hayCambiosFormulario) {
      setError(
        'Guarda los cambios del borrador antes de liberar la selección. Así evitarás perder modificaciones sin guardar.'
      );
      return;
    }

    setSeleccionado(null);
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setImagenesPendientes([]);
    setConfirmandoPublicacion(false);
    setError('');
    setMensaje(
      'Has salido de la edición. El borrador permanece guardado y disponible en la lista.'
    );
  }

  function seleccionarBorrador(borrador: BorradorCms) {
    if (ocupado || cargandoSeccion || !puedeEditar) return;

    if (
      hayCambiosFormulario &&
      seleccionado?.idBorrador !== borrador.idBorrador
    ) {
      setError(
        'Guarda los cambios del borrador actual antes de seleccionar otro.'
      );
      return;
    }

    const slidesAsociados = identificarSlidesBorrador(
      borrador,
      inventarioSlides,
      PAGINA_INICIO
    );

    if (slidesAsociados.length === 0) {
      setError(
        `No se pudo identificar a qué slide pertenece el borrador #${borrador.idBorrador}. No se seleccionó para evitar modificar una sección incorrecta.`
      );
      return;
    }

    // Si contiene portada y diapositiva promocional, prioriza esta última.
    const numeroSlide = elegirSlideInicialBorrador(slidesAsociados, slideActivo);
    if (numeroSlide === null) return;

    const slideObjetivo = inventarioSlides.find(
      (item) => item.numero === numeroSlide
    );

    const seccionObjetivo = seccionesInicio?.find(
      (item) => item.idSeccion === slideObjetivo?.idSeccionCms
    );

    if (!seccionObjetivo || slideObjetivo?.estado !== 'EDITOR_CMS') {
      setError(
        `No se encontró la sección CMS correspondiente al slide ${numeroSlide}. Recarga la lista antes de editar.`
      );
      return;
    }

    try {
      setCamposPromo(cargarCamposPromo(
        seccionObjetivo,
        borrador.contenidoPendiente
      ));
    } catch (err: unknown) {
      setError(describirError(err));
      return;
    }

    setSeleccionado(borrador);
    setSlideActivo(numeroSlide);
    setPrevisualizando(false);
    setRevisionPrevisualizada(null);
    setConfirmandoPublicacion(false);
    setImagenesPendientes([]);
    setError('');

    const slidesTexto = slidesAsociados
      .map((numero) => `Slide ${numero}`)
      .join(', ');

    setMensaje(
      slidesAsociados.length === 1
        ? `Borrador #${borrador.idBorrador} asociado a ${slidesTexto}. Solo puedes editar las diapositivas guardadas en este borrador.`
        : `El borrador #${borrador.idBorrador} contiene cambios en ${slidesTexto}. Se abrió el Slide ${numeroSlide}; los demás cambios se conservarán.`
    );
  }

  // =========================================================
  // EDICIÓN Y GUARDADO DE TEXTOS
  // =========================================================

  function guardarSlide(crear: boolean) {
    if (
      (crear && seleccionado) ||
      (!crear && !seleccionado) ||
      !seccionActiva ||
      !editable ||
      errorCampos ||
      !hayCambiosFormulario ||
      ocupado
    ) {
      return;
    }

    const borradorActual = seleccionado;
    const ejecutarCambio = () => {
      const cambios = fusionarCambioSlide(
        crear ? null : borradorActual?.contenidoPendiente ?? null,
        seccionActiva.idSeccion,
        camposPromo,
        slideActivo !== 1
      );

      if (crear) return webContentDraftService.crearPagina(PAGINA_INICIO, cambios);
      if (!borradorActual) throw new Error('Selecciona un borrador antes de actualizar.');
      return webContentDraftService.actualizarPagina(
        borradorActual.idBorrador,
        borradorActual.revisionEdicion,
        cambios
      );
    };

    void ejecutar(
      ejecutarCambio,
      crear
        ? 'Nuevo borrador creado. La página pública no ha cambiado.'
        : 'Cambios guardados correctamente en el borrador.'
    );
  }

  // =========================================================
  // PREPARACIÓN DE IMÁGENES
  // =========================================================

  function prepararSoloImagen() {
    if (
      !seccionActiva ||
      !editable ||
      !borradorIncluyeSlideActivo ||
      tieneCambioGuardado ||
      hayCambiosFormulario ||
      ocupado
    ) {
      return;
    }

    void ejecutar(() => {
      const secciones = prepararCambioSoloImagen(
        seleccionado?.contenidoPendiente ?? null,
        seccionActiva.idSeccion
      );

      return seleccionado
        ? webContentDraftService.actualizarPagina(
          seleccionado.idBorrador,
          seleccionado.revisionEdicion,
          secciones
        )
        : webContentDraftService.crearPagina(
          PAGINA_INICIO,
          secciones
        );
    }, 'Sección preparada para añadir una imagen.');
  }

  // =========================================================
  // PREVISUALIZACIÓN
  // =========================================================

  async function previsualizarBorrador() {
    if (
      !seleccionado ||
      !seccionActiva ||
      !borradorIncluyeSlideActivo ||
      hayCambiosFormulario ||
      ocupado
    ) {
      return;
    }

    setOcupado(true);
    setError('');
    setConfirmandoPublicacion(false);

    setPrevisualizando(false);
    setRevisionPrevisualizada(null);

    try {
      const imagenes = await webContentDraftImageService.listar(
        seleccionado.idBorrador
      );

      if (imagenes.some(
        (imagen) =>
          imagen.revisionEdicion !== seleccionado.revisionEdicion
      )) {
        throw new Error(
          'El borrador cambió al cargar las imágenes. Recarga antes de continuar.'
        );
      }

      setImagenesPendientes(imagenes);
      setPrevisualizando(true);
      setRevisionPrevisualizada(seleccionado.revisionEdicion);

    } catch (err: unknown) {
      setImagenesPendientes([]);
      setError(describirError(err));
    } finally {
      setOcupado(false);
    }
  }

  // =========================================================
  // PUBLICACIÓN
  // =========================================================

  async function publicarTextos() {
    if (
      !habilitarConfirmacion ||
      !confirmandoPublicacion ||
      !seleccionado ||
      !evaluacionPublicacion.valido
    ) {
      return;
    }

    const borradorConfirmado = seleccionado;

    setOcupado(true);
    setError('');
    setMensaje('');
    setConfirmandoPublicacion(false);

    try {
      const respuesta = PUBLICACION_IMAGENES_HABILITADA
        ? await webContentDraftService.publicarContenido(
          borradorConfirmado
        )
        : await webContentDraftService.publicarTextos(
          borradorConfirmado
        );

      const confirmacionConsistente =
        respuesta.idBorrador === borradorConfirmado.idBorrador &&
        respuesta.idPagina === PAGINA_INICIO &&
        respuesta.revisionAnterior === borradorConfirmado.revisionBase &&
        respuesta.revisionNueva === borradorConfirmado.revisionBase + 1;

      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setSeleccionado(null);

      setBorradores((actuales) =>
        actuales.filter(
          (item) =>
            item.idBorrador !== borradorConfirmado.idBorrador
        )
      );

      setMensaje(
        confirmacionConsistente
          ? `${PUBLICACION_IMAGENES_HABILITADA ? 'Contenido' : 'Textos'} publicado correctamente. Revisión pública ${respuesta.revisionNueva}.`
          : 'El servidor respondió a la publicación, pero la confirmación es inconsistente. Verifica el historial antes de repetir.'
      );

      try {
        const [datos, secciones] = await Promise.all([
          webContentDraftService.listar(),
          webContentDraftService.listarSecciones(PAGINA_INICIO)
        ]);

        setBorradores(datos);
        setSeccionesInicio(secciones);

      } catch {
        setError(
          'La publicación fue confirmada, pero no se pudo actualizar la vista. Recarga antes de editar nuevamente.'
        );
      }

    } catch (err: unknown) {
      setPrevisualizando(false);
      setRevisionPrevisualizada(null);
      setError(describirErrorPublicacion(err));
    } finally {
      setOcupado(false);
    }
  }

  // =========================================================
  // ESTILOS
  // =========================================================

  const inputClass =
    'w-full rounded-md border px-3 py-2 text-sm text-brand-900 outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-brand-50';

  const buttonClass =
    'rounded-md border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50';

  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div>
      <PageHeader
        title="Gestión de contenido web"
        description="Administra los textos y las imágenes promocionales de la página pública."
      />

      {/* ESTADO DE LOS SLIDES */}

      <section
        aria-label="Estado de las tres diapositivas de Inicio"
        className="mb-5 rounded-lg border border-brand-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-brand-900">
          Diapositivas de Inicio
        </h2>

        <p className="mt-1 text-xs text-brand-500">
          Puedes modificar el contenido promocional sin alterar los datos comerciales oficiales de los proyectos.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {inventarioSlides.map((item) => (
            <div
              key={item.clave}
              className="rounded-md border border-brand-100 bg-brand-50/30 p-3"
            >
              <p className="text-xs font-semibold text-brand-500">
                Slide {item.numero}
              </p>

              <h3 className="mt-1 text-sm font-semibold text-brand-900">
                {item.nombre}
              </h3>

              <p className={`mt-2 text-xs font-medium ${item.estado === 'EDITOR_CMS'
                ? 'text-emerald-700'
                : 'text-amber-800'
                }`}>
                {item.estado === 'EDITOR_CMS'
                  ? 'Disponible para editar'
                  : 'Solo lectura · integración pendiente'}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-brand-600">
                {item.descripcion}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-brand-500">
          Los slides 2 y 3 conservan los títulos y las descripciones comerciales originales de React. El CMS solo cambia el subtítulo y el fondo tras una publicación autorizada y la activación de lectura pública en el despliegue.
        </p>
      </section>

      <Card>
        <CardHeader
          title="Editor de contenido promocional"
          description="Modifica el contenido, guarda tus cambios y revisa cómo quedará antes de publicarlo."
        />

        <CardBody>

          <p className="mb-4 text-[13px] leading-relaxed text-brand-500">
            Los cambios se guardan primero como borradores privados.
            La página pública no cambia hasta que un usuario autorizado confirme la publicación.
          </p>

          {error && (
            <p
              role="alert"
              className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          {mensaje && (
            <p
              role="status"
              className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
            >
              {mensaje}
            </p>
          )}

          {/* SELECCIÓN DEL SLIDE */}

          <fieldset className="mb-5">
            <legend className="mb-2 text-sm font-semibold text-brand-800">
              1. Selecciona la diapositiva que deseas modificar
            </legend>

            <div className="flex flex-wrap gap-2">
              {inventarioSlides.map((item) => (
                <button
                  key={item.numero}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-sm ${slideActivo === item.numero
                    ? 'border-brand-800 bg-brand-900 text-white'
                    : buttonClass
                    }`}
                  disabled={
                    item.estado !== 'EDITOR_CMS' ||
                    ocupado ||
                    (Boolean(seleccionado) && !slidesDelBorrador.includes(item.numero))
                  }
                  aria-pressed={slideActivo === item.numero}
                  title={
                    seleccionado && !slidesDelBorrador.includes(item.numero)
                      ? 'Esta diapositiva no pertenece al borrador. Libera la selección para editarla.'
                      : seleccionado && hayCambiosFormulario && item.numero !== slideActivo
                        ? 'Guarda los cambios actuales antes de cambiar de diapositiva.'
                        : undefined
                  }
                  onClick={() => cambiarSlide(item.numero)}
                >
                  {seleccionado && slideActivo === item.numero ? 'En edición: ' : ''}
                  Slide {item.numero} · {item.nombre}
                </button>
              ))}
            </div>
          </fieldset>

          {!seleccionado && hayCambiosFormulario && (
            <p role="status" className="mb-4 text-xs text-amber-800">
              Guarda estos cambios en un borrador antes de seleccionar otro slide o borrador.
            </p>
          )}

          {seleccionado && (
            <div className="mb-4 rounded-md border border-brand-200 bg-brand-50 p-3">
              <p className="text-sm font-semibold text-brand-900">
                Borrador #{seleccionado.idBorrador} seleccionado
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-700">
                {slidesDelBorrador.length === 1
                  ? `Este borrador pertenece al Slide ${slidesDelBorrador[0]}. Las demás diapositivas están bloqueadas para evitar guardar cambios en otra sección.`
                  : slidesDelBorrador.length > 1
                    ? `Este borrador contiene cambios en ${slidesDelBorrador.map((numero) => `Slide ${numero}`).join(', ')}. Puedes alternar entre ellos después de guardar los cambios de cada slide; los demás se conservarán.`
                    : 'No se pudo reconocer la diapositiva asociada a este borrador. No se permitirá editarlo hasta revisar su contenido.'}
              </p>
              {hayCambiosFormulario && (
                <p className="mt-2 text-xs font-medium text-amber-800">
                  Tienes cambios sin guardar. Guarda antes de cambiar de slide, salir de la edición o seleccionar otro borrador.
                </p>
              )}
            </div>
          )}

          {slideActivo !== 1 && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs leading-relaxed text-amber-800">
                En este slide solamente puedes modificar el subtítulo promocional.
                Los títulos, las descripciones comerciales y los datos oficiales del proyecto no se modifican aquí.
              </p>
            </div>
          )}

          {/* CAMPOS DE EDICIÓN */}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-brand-900">
              2. Edita el contenido
            </h3>

            {cargandoSeccion && (
              <p className="text-sm text-brand-500">
                Cargando información de la página...
              </p>
            )}

            {!cargandoSeccion && errorSeccion && (
              <p role="alert" className="text-sm text-rose-700">
                {errorSeccion}
              </p>
            )}

            {!cargandoSeccion && !errorSeccion && (
              <div className="grid gap-4">

                {camposEditables.map((campo) => {
                  const errorCampo =
                    campo === 'subtitulo' && slideActivo !== 1
                      ? validarSubtituloPromo(camposPromo.subtitulo)
                      : validarCampoIndividual(
                        campo,
                        camposPromo[campo]
                      );

                  const obligatorio = campo === 'titulo';

                  const etiqueta =
                    campo === 'titulo'
                      ? 'Título promocional'
                      : campo === 'subtitulo'
                        ? 'Subtítulo promocional'
                        : 'Descripción promocional';

                  const valor = camposPromo[campo];
                  const limite = MAXIMOS_CAMPOS[campo];

                  const claseCampo = `${inputClass} ${errorCampo
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-brand-200'
                    }`;

                  return (
                    <div key={campo}>
                      <label
                        htmlFor={`cms-${campo}`}
                        className="block text-sm font-medium text-brand-800"
                      >
                        {etiqueta}

                        <span className={`ml-2 text-xs font-normal ${obligatorio
                          ? 'text-rose-600'
                          : 'text-brand-400'
                          }`}>
                          {obligatorio ? 'Obligatorio' : 'Opcional'}
                        </span>
                      </label>

                      {campo === 'contenido' ? (
                        <textarea
                          id={`cms-${campo}`}
                          rows={4}
                          className={`mt-1 ${claseCampo}`}
                          maxLength={limite}
                          value={valor}
                          disabled={!editable || ocupado}
                          aria-invalid={Boolean(errorCampo)}
                          aria-describedby={
                            errorCampo
                              ? `error-${campo}`
                              : `contador-${campo}`
                          }
                          placeholder="Escribe una descripción breve y clara..."
                          onChange={(event) => {
                            setCamposPromo((actual) => ({
                              ...actual,
                              [campo]: event.target.value
                            }));

                            setPrevisualizando(false);
                            setRevisionPrevisualizada(null);
                            setImagenesPendientes([]);
                            setConfirmandoPublicacion(false);
                            setError('');
                            setMensaje('');
                          }}
                        />
                      ) : (
                        <input
                          id={`cms-${campo}`}
                          type="text"
                          className={`mt-1 ${claseCampo}`}
                          maxLength={limite}
                          value={valor}
                          disabled={!editable || ocupado}
                          aria-invalid={Boolean(errorCampo)}
                          aria-describedby={
                            errorCampo
                              ? `error-${campo}`
                              : `contador-${campo}`
                          }
                          placeholder={
                            campo === 'titulo'
                              ? 'Escribe el título principal...'
                              : 'Escribe un subtítulo promocional...'
                          }
                          onChange={(event) => {
                            setCamposPromo((actual) => ({
                              ...actual,
                              [campo]: event.target.value
                            }));

                            setPrevisualizando(false);
                            setRevisionPrevisualizada(null);
                            setImagenesPendientes([]);
                            setConfirmandoPublicacion(false);
                            setError('');
                            setMensaje('');
                          }}
                        />
                      )}

                      <div className="mt-1 flex items-start justify-between gap-2">
                        {errorCampo ? (
                          <p
                            id={`error-${campo}`}
                            role="alert"
                            className="text-xs text-rose-600"
                          >
                            {errorCampo}
                          </p>
                        ) : (
                          <p
                            id={`contador-${campo}`}
                            className="text-xs text-brand-400"
                          >
                            {obligatorio
                              ? 'Este campo es necesario para guardar.'
                              : 'Puedes dejar este campo vacío.'}
                          </p>
                        )}

                        <span className={`shrink-0 text-xs ${valor.length >= limite
                          ? 'font-semibold text-amber-700'
                          : 'text-brand-400'
                          }`}>
                          {valor.length}/{limite}
                        </span>
                      </div>
                    </div>
                  );
                })}

              </div>
            )}

            {errorCampos && (
              <p
                role="status"
                className="mt-3 text-xs text-amber-800"
              >
                Revisa los campos indicados antes de guardar.
              </p>
            )}

            {editable && !hayCambiosFormulario && !errorCampos && (
              <p className="mt-3 text-xs text-brand-500">
                No hay cambios nuevos en este slide. Modifica algún campo para habilitar el guardado.
              </p>
            )}
          </section>

          {/* ACCIONES DEL BORRADOR */}

          <section className="mt-5 border-t border-brand-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-brand-900">
              3. Guarda tus cambios
            </h3>

            <p className="mb-3 text-xs leading-relaxed text-brand-500">
              {seleccionado
                ? 'Estás editando un borrador existente. Guarda los cambios en ese mismo borrador; no se creará otro.'
                : 'Crear un borrador nuevo genera una copia independiente. Después de seleccionarlo, podrás seguir editándolo sin cambiar de diapositiva.'}
            </p>

            <div className="flex flex-wrap gap-2">

              {!seleccionado && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={
                    !editable ||
                    ocupado ||
                    Boolean(errorCampos) ||
                    !hayCambiosFormulario
                  }
                  onClick={() => guardarSlide(true)}
                >
                  Crear borrador nuevo
                </button>
              )}

              {seleccionado && (
                <>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={
                      !editable ||
                      ocupado ||
                      Boolean(errorCampos) ||
                      !hayCambiosFormulario
                    }
                    onClick={() => guardarSlide(false)}
                  >
                    Guardar cambios en borrador #{seleccionado.idBorrador}
                  </button>

                  <button
                    type="button"
                    className={buttonClass}
                    disabled={ocupado || hayCambiosFormulario}
                    onClick={liberarSeleccionBorrador}
                    title={
                      hayCambiosFormulario
                        ? 'Guarda primero los cambios pendientes.'
                        : 'Conserva el borrador y libera el selector de diapositivas.'
                    }
                  >
                    Dejar de editar (conservar borrador)
                  </button>
                </>
              )}

              <button
                type="button"
                className={buttonClass}
                disabled={
                  !editable ||
                  ocupado ||
                  tieneCambioGuardado ||
                  hayCambiosFormulario
                }
                onClick={prepararSoloImagen}
              >
                Preparar solo imagen
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={
                  !puedeEditar ||
                  ocupado ||
                  !seleccionado ||
                  hayCambiosFormulario
                }
                onClick={() => {
                  if (!seleccionado) return;

                  void ejecutar(
                    () => webContentDraftService.descartarPagina(
                      seleccionado.idBorrador,
                      seleccionado.revisionEdicion
                    ),
                    'Borrador descartado sin publicar.'
                  );
                }}
              >
                Descartar borrador seleccionado
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={ocupado || cargando || hayCambiosFormulario}
                onClick={() => {
                  setError('');
                  setMensaje('');
                  setOcupado(true);

                  void recargar()
                    .catch((err: unknown) => setError(describirError(err)))
                    .finally(() => setOcupado(false));
                }}
              >
                Recargar lista
              </button>

            </div>

            <p className="mt-3 text-xs text-brand-400">
              La versión del borrador aumenta cuando guardas cambios.
              Si no has modificado ningún campo, no necesitas volver a guardarlo.
            </p>
          </section>

          {/* PREVISUALIZACIÓN */}

          <section className="mt-5 border-t border-brand-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-brand-900">
              4. Revisa cómo quedará tu página
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={buttonClass}
                disabled={
                  ocupado ||
                  cargandoSeccion ||
                  !seleccionado ||
                  !seccionActiva ||
                  !tieneCambioGuardado ||
                  hayCambiosFormulario ||
                  seleccionado.estado !== 'EN_EDICION'
                }
                onClick={() => void previsualizarBorrador()}
              >
                Previsualizar borrador guardado
              </button>

              <span className="text-xs text-brand-500">
                Primero guarda los cambios. Después podrás revisar el resultado antes de publicarlo.
              </span>
            </div>

            {errorSeccion && (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {errorSeccion}
              </p>
            )}

            <p className="mt-3 text-xs text-brand-400">
              Las imágenes nuevas deben guardarse mediante el flujo de imágenes privadas antes de publicar.
            </p>
          </section>

          {/* LISTA DE BORRADORES */}

          <section className="mt-6 border-t border-brand-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-900">
              5. Tus borradores de Inicio
            </h3>

            {cargando && (
              <p className="text-sm text-brand-400">
                Cargando borradores...
              </p>
            )}

            {!cargando && pruebasInicio.length === 0 && (
              <p className="text-sm text-brand-400">
                Todavía no tienes borradores pendientes para Inicio.
              </p>
            )}

            <div className="space-y-2">
              {pruebasInicio.map((borrador) => {
                const slidesAsociados = identificarSlidesBorrador(
                  borrador,
                  inventarioSlides,
                  PAGINA_INICIO
                );
                const esSeleccionado =
                  seleccionado?.idBorrador === borrador.idBorrador;
                const etiquetaSlides = slidesAsociados.length > 0
                  ? slidesAsociados.map((numero) => `Slide ${numero}`).join(' · ')
                  : 'No asociado a un slide editable';

                return (
                  <div
                    key={borrador.idBorrador}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 ${esSeleccionado
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-brand-100'
                      }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-brand-800">
                        Borrador #{borrador.idBorrador}
                      </p>

                      <p className="mt-1 text-xs text-brand-500">
                        {etiquetaSlides}
                      </p>

                      <p className="mt-1 text-xs text-brand-500">
                        Versión guardada: {borrador.revisionEdicion}
                        {esSeleccionado
                          ? ' · Actualmente seleccionado'
                          : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={buttonClass}
                      disabled={
                        ocupado ||
                        cargandoSeccion ||
                        !puedeEditar ||
                        slidesAsociados.length === 0 ||
                        (
                          !esSeleccionado &&
                          hayCambiosFormulario
                        )
                      }
                      onClick={() => seleccionarBorrador(borrador)}
                    >
                      {esSeleccionado ? 'Seleccionado' : 'Seleccionar'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* COMPONENTE DE PREVISUALIZACIÓN */}

          {previsualizando && seleccionado && seccionActiva && (
            <CmsDraftPreview
              key={`${seleccionado.idBorrador}-${seccionActiva.idSeccion}`}
              seccion={seccionActiva}
              borrador={seleccionado}
              cerrar={() => {
                setPrevisualizando(false);
                setConfirmandoPublicacion(false);
              }}
              puedeEditar={puedeEditar}
              cambioRevision={(revision) => {
                setPrevisualizando(false);
                setRevisionPrevisualizada(null);
                setConfirmandoPublicacion(false);

                const idBorrador = seleccionado.idBorrador;

                setSeleccionado((actual) =>
                  actual?.idBorrador === idBorrador
                    ? { ...actual, revisionEdicion: revision }
                    : actual
                );

                setBorradores((actuales) =>
                  actuales.map((item) =>
                    item.idBorrador === idBorrador
                      ? { ...item, revisionEdicion: revision }
                      : item
                  )
                );
              }}
            />
          )}

          {/* PUBLICACIÓN */}

          {seleccionado && (
            <section
              aria-label="Publicación de textos del borrador"
              className="mt-5 rounded-lg border border-brand-200 bg-white p-4"
            >
              <h3 className="text-sm font-semibold text-brand-900">
                6. Publicar cambios
              </h3>

              <p className="mt-1 text-xs text-brand-600">
                La publicación actualiza la página pública.
                Solo está disponible para usuarios con autorización y después de revisar el borrador.
              </p>

              {!PUBLICACION_TEXTOS_HABILITADA &&
                !PUBLICACION_IMAGENES_HABILITADA && (
                  <p
                    role="status"
                    className="mt-2 text-xs text-amber-800"
                  >
                    La publicación está deshabilitada hasta aprobar las migraciones y los permisos del entorno.
                  </p>
                )}

              {!puedePublicar && (
                <p className="mt-2 text-xs text-brand-500">
                  Tu rol no tiene permiso para publicar.
                </p>
              )}

              {!previsualizando && (
                <p className="mt-2 text-xs text-brand-600">
                  Abre nuevamente la previsualización del borrador guardado
                  para actualizar el resumen de imágenes y su revisión.
                </p>
              )}

              {!evaluacionPublicacion.valido && (
                <p
                  role="alert"
                  className="mt-2 text-xs text-amber-800"
                >
                  {evaluacionPublicacion.motivo}
                </p>
              )}

              {previsualizando && evaluacionPublicacion.valido && (
                <div className="mt-3 space-y-3">

                  <h4 className="text-xs font-semibold text-brand-800">
                    Resumen de cambios
                  </h4>

                  <div className="rounded border border-brand-100 p-3 text-xs">
                    <p className="font-semibold text-brand-800">
                      Imágenes privadas pendientes: {imagenesPendientes.length}
                    </p>
                    <p className="mt-1 text-brand-600">
                      Campos de texto pendientes: {evaluacionPublicacion.secciones.reduce(
                        (total, item) => total + item.textos.length, 0
                      )}
                    </p>

                    {imagenesPendientes.map((imagen) => (
                      <p
                        key={imagen.idSeccion}
                        className="mt-1 text-brand-600"
                      >
                        Sección #{imagen.idSeccion} · {imagen.mimeType} · {imagen.tamanoBytes ?? 0} bytes
                      </p>
                    ))}

                    {imagenesPendientes.length > 0 &&
                      !PUBLICACION_IMAGENES_HABILITADA && (
                        <p className="mt-2 text-amber-800">
                          No se pueden publicar imágenes hasta activar el publicador correspondiente.
                        </p>
                      )}
                  </div>

                  {evaluacionPublicacion.secciones.map((seccion) => (
                    <div
                      key={seccion.idSeccion}
                      className="rounded border border-brand-100 p-3 text-xs"
                    >
                      <p className="font-semibold text-brand-800">
                        {seccion.codigo} · Sección #{seccion.idSeccion}
                      </p>

                      {seccion.textos.map((texto) => (
                        <div
                          key={texto.campo}
                          className="mt-2 break-words"
                        >
                          <p className="font-medium text-brand-800">
                            {texto.campo}
                          </p>

                          <p className="text-brand-500">
                            Actual: {texto.actual || '(vacío)'}
                          </p>

                          <p className="text-brand-800">
                            Nuevo: {texto.nuevo || '(vacío)'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}

                  <p className="text-xs text-brand-500">
                    Borrador #{seleccionado.idBorrador} ·
                    Versión {seleccionado.revisionEdicion} ·
                    Revisión pública esperada {seleccionado.revisionBase}.
                  </p>

                  {evaluacionPublicacion.secciones.some(
                    (item) => item.codigo !== 'HERO_PRINCIPAL'
                  ) && (
                      <p className="text-xs text-amber-800">
                        El carrusel público aplica los subtítulos y fondos solo tras publicarlos
                        y habilitar los indicadores de lectura CMS en la página web.
                        Los títulos y las descripciones comerciales permanecen protegidos.
                      </p>
                    )}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={!habilitarConfirmacion}
                  onClick={() => setConfirmandoPublicacion(true)}
                >
                  {PUBLICACION_IMAGENES_HABILITADA
                    ? 'Publicar textos e imágenes'
                    : 'Publicar textos'}
                </button>
              </div>

              {confirmandoPublicacion && habilitarConfirmacion && (
                <div
                  role="group"
                  aria-label="Confirmación de publicación"
                  className="mt-3 rounded-md border border-amber-300 p-3"
                >
                  <p className="text-xs font-semibold text-brand-900">
                    ¿Confirmas la publicación de los cambios?
                  </p>

                  <p className="mt-1 text-xs text-brand-600">
                    {PUBLICACION_IMAGENES_HABILITADA
                      ? 'Se publicarán los textos autorizados y las imágenes privadas verificadas del borrador.'
                      : 'Se publicarán únicamente los textos autorizados. Si hay imágenes privadas pendientes, el servidor rechazará la operación.'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={ocupado}
                      className={buttonClass}
                      onClick={() => void publicarTextos()}
                    >
                      Confirmar publicación
                    </button>

                    <button
                      type="button"
                      disabled={ocupado}
                      className={buttonClass}
                      onClick={() => setConfirmandoPublicacion(false)}
                    >
                      Cancelar
                    </button>
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

// =============================================================
// MANEJO DE ERRORES
// =============================================================

function describirError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 409
  ) {
    return 'El borrador cambió en otra sesión. Recarga la lista y vuelve a seleccionarlo.';
  }

  return error instanceof Error
    ? error.message
    : 'No fue posible completar la operación.';
}

function describirErrorPublicacion(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error) {
    switch (error.status) {
      case 400:
        return 'La solicitud o el contenido del borrador no cumple los requisitos de publicación.';

      case 401:
        return 'La sesión expiró. Vuelve a iniciar sesión.';

      case 403:
        return 'No tienes permiso para publicar este contenido.';

      case 404:
        return 'No se encontró el borrador propio. Recarga la lista.';

      case 409:
        return 'El borrador, las imágenes pendientes o la versión pública generan un conflicto. Recarga y revisa antes de intentar de nuevo.';
    }
  }

  return error instanceof Error
    ? error.message
    : 'No fue posible confirmar la publicación.';
}
