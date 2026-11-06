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

function nombreZona(numero: 1 | 2 | 3): string {
  return numero === 1 ? 'Portada principal' : numero === 2 ? 'Presentación del proyecto' : 'Opciones de pago';
}

function nombreCampo(campo: string): string {
  return campo === 'titulo' ? 'Título principal' : campo === 'subtitulo' ? 'Frase de presentación'
    : campo === 'contenido' ? 'Descripción breve' : campo;
}

function nombreSeccion(codigo: string): string {
  return codigo === 'HERO_PRINCIPAL' ? 'Portada principal'
    : codigo === 'HERO_SLIDE_2_PROMO' ? 'Presentación del proyecto'
    : codigo === 'HERO_SLIDE_3_PROMO' ? 'Opciones de pago' : 'Otro contenido de Inicio';
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
  const [intentoCarga, setIntentoCarga] = useState(0);

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
    setCargandoSeccion(true);
    setErrorSeccion('');

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
  }, [intentoCarga]);

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
      setError(`«${nombreZona(numero)}» todavía no está disponible para editar.`);
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
        ? `Cambios de «${nombreZona(numeroSlide)}» abiertos. Guarda antes de cambiar de zona.`
        : `Se recuperaron tus cambios de ${slidesTexto}. Puedes seguir editando.`
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
        title="Edita tu página web"
        description="Actualiza las fotografías y mensajes que ven los visitantes de tu sitio."
      />

      <section aria-label="Guía para actualizar la página" className="mb-6 overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
        <div className="bg-brand-900 px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">Página pública · Inicio</p>
          <h2 className="mt-2 text-xl font-bold sm:text-2xl">Cambia tu página con tranquilidad</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-brand-100">
            Elige qué parte quieres cambiar, guarda tu trabajo y mira cómo quedará antes de publicarlo.
            Tus visitantes seguirán viendo la versión actual hasta que confirmes la publicación.
          </p>
        </div>
        <ol className="grid divide-y divide-brand-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ['1', 'Elige y modifica', 'Selecciona una parte de Inicio y edita su mensaje o su imagen.'],
            ['2', 'Guarda y revisa', 'Comprueba cómo se verá en computadora y celular.'],
            ['3', 'Publica cuando esté listo', 'Los cambios solo serán visibles después de tu confirmación.']
          ].map(([paso, titulo, detalle]) => (
            <li key={paso} className="flex gap-3 p-4">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-900">{paso}</span>
              <div><p className="text-sm font-semibold text-brand-900">{titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-brand-600">{detalle}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader
          title="Cambia los textos y las imágenes de Inicio"
          description="Sigue los pasos en orden. Puedes guardar tu trabajo y continuar después."
        />

        <CardBody>

          <p className="mb-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-900">
            <strong>Guardar no significa publicar.</strong> Puedes hacer cambios y revisarlos sin que nadie
            fuera del equipo los vea. Solamente al pulsar «Publicar» cambiará la página pública.
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

          <fieldset className="mb-6">
            <legend className="mb-3 text-base font-semibold text-brand-900">
              1. ¿Qué parte de Inicio quieres cambiar?
            </legend>
            <div className="grid gap-3 md:grid-cols-3">
              {inventarioSlides.map((item) => {
                const activa = slideActivo === item.numero;
                const disponible = item.estado === 'EDITOR_CMS';
                const pertenece = !seleccionado || slidesDelBorrador.includes(item.numero);
                return (
                  <button
                    key={item.numero}
                    type="button"
                    className={activa
                      ? 'min-h-36 rounded-xl border-2 border-brand-900 bg-brand-50 p-4 text-left shadow-sm'
                      : 'min-h-36 rounded-xl border border-brand-200 bg-white p-4 text-left transition hover:border-brand-500 disabled:cursor-not-allowed disabled:bg-brand-50 disabled:opacity-75'}
                    disabled={!disponible || !pertenece || ocupado}
                    aria-pressed={activa}
                    title={!disponible ? 'El administrador debe habilitar esta parte de la página.'
                      : !pertenece ? 'Termina la edición actual para cambiar de zona.'
                        : hayCambiosFormulario && !activa ? 'Guarda lo que escribiste antes de cambiar de zona.' : undefined}
                    onClick={() => cambiarSlide(item.numero)}
                  >
                    <span className="block text-xs font-semibold uppercase text-brand-500">Zona {item.numero}</span>
                    <span className="mt-2 block text-base font-bold text-brand-900">{nombreZona(item.numero)}</span>
                    <span className="mt-2 block text-xs leading-relaxed text-brand-600">
                      {item.numero === 1 ? 'Primera imagen, título y texto de la página.'
                        : item.numero === 2 ? 'Fotografía y frase de presentación del proyecto.'
                          : 'Fotografía y frase sobre las opciones de pago.'}
                    </span>
                    <span className={disponible
                      ? 'mt-3 block text-xs font-semibold text-emerald-800'
                      : 'mt-3 block text-xs font-semibold text-amber-800'}>
                      {!disponible ? 'No disponible por ahora'
                        : !pertenece ? 'Finaliza la edición anterior'
                          : activa ? '✓ Seleccionada' : 'Elegir esta zona'}
                    </span>
                  </button>
                );
              })}
            </div>
            {!cargandoSeccion && inventarioSlides.some((item) => item.estado !== 'EDITOR_CMS') && (
              <p className="mt-3 text-sm text-brand-600">
                Algunas zonas aún no están habilitadas. Solicita ayuda al administrador;
                puedes seguir trabajando con las zonas disponibles.
              </p>
            )}
          </fieldset>

          {!seleccionado && hayCambiosFormulario && (
            <p role="status" className="mb-4 text-xs text-amber-800">
              Guarda estos cambios en un borrador antes de seleccionar otro slide o borrador.
            </p>
          )}

          {seleccionado && (
            <div className="mb-4 rounded-md border border-brand-200 bg-brand-50 p-3">
              <p className="text-sm font-semibold text-brand-900">Estás retomando un cambio guardado</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-700">
                {slidesDelBorrador.length === 1
                  ? `Este cambio corresponde a «${nombreZona(slidesDelBorrador[0])}». Guarda antes de editar otra zona.`
                  : slidesDelBorrador.length > 1
                    ? `Este cambio contiene ${slidesDelBorrador.map((numero) => nombreZona(numero)).join(' y ')}. Guarda antes de cambiar de zona.`
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
                En esta zona solo puedes modificar la frase breve de presentación.
                Los títulos, las descripciones comerciales y los datos oficiales del proyecto no se modifican aquí.
              </p>
            </div>
          )}

          {/* CAMPOS DE EDICIÓN */}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-brand-900">
              2. Escribe lo que quieres mostrar
            </h3>

            {cargandoSeccion && (
              <p className="text-sm text-brand-500">
                Cargando información de la página...
              </p>
            )}

            {!cargandoSeccion && errorSeccion && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <p className="font-semibold">No pudimos cargar esta parte de Inicio.</p>
                <p className="mt-1">{errorSeccion}</p>
                <button type="button" className="mt-3 rounded-md bg-brand-900 px-4 py-2 font-semibold text-white"
                  disabled={ocupado} onClick={() => setIntentoCarga((actual) => actual + 1)}>
                  Volver a intentar
                </button>
              </div>
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

                  const etiqueta = nombreCampo(campo);

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
                          placeholder="Cuenta en pocas palabras qué quieres comunicar..."
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
                              ? 'Ejemplo: Un lugar para crecer en familia'
                              : 'Ejemplo: Conoce un entorno diferente'
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

            {errorCampos && hayCambiosFormulario && !cargandoSeccion && (
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
              3. Guarda tu trabajo
            </h3>

            <p className="mb-3 text-xs leading-relaxed text-brand-500">
              {seleccionado
                ? 'Actualiza lo que ya guardaste. Los visitantes aún no verán estos cambios.'
                : 'Guarda tu trabajo para revisarlo antes de mostrárselo a los visitantes.'}
            </p>

            <div className="flex flex-wrap gap-2">

              {!seleccionado && (
                <button
                  type="button"
                  className={'rounded-md bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'}
                  disabled={
                    !editable ||
                    ocupado ||
                    Boolean(errorCampos) ||
                    !hayCambiosFormulario
                  }
                  onClick={() => guardarSlide(true)}
                >
                  Guardar para revisar
                </button>
              )}

              {seleccionado && (
                <>
                  <button
                    type="button"
                    className={'rounded-md bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'}
                    disabled={
                      !editable ||
                      ocupado ||
                      Boolean(errorCampos) ||
                      !hayCambiosFormulario
                    }
                    onClick={() => guardarSlide(false)}
                  >
                    Guardar mis cambios
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
                    Terminar edición
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
                Quiero cambiar solo la foto
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
                Eliminar cambio guardado
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
                Actualizar información
              </button>

            </div>

            <p className="mt-3 text-xs leading-relaxed text-brand-600">
              ¿Solo quieres cambiar una foto? Pulsa «Quiero cambiar solo la foto» y después
              «Ver cómo quedará» para elegirla y guardarla. La página pública no cambia todavía.
            </p>
          </section>

          {/* PREVISUALIZACIÓN */}

          <section className="mt-5 border-t border-brand-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-brand-900">
              4. Comprueba cómo se verá
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
                Ver cómo quedará
              </button>

              <span className="text-xs text-brand-500">
                Guarda primero, después compara la página actual con tu propuesta.
              </span>
            </div>

            {errorSeccion && (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {errorSeccion}
              </p>
            )}

            <p className="mt-3 text-xs text-brand-400">
              En la vista previa también podrás elegir una fotografía y guardarla.
            </p>
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
                5. Haz visibles tus cambios
              </h3>

              <p className="mt-1 text-sm text-brand-600">
                Después de revisar los cambios, publícalos para que los visitantes puedan verlos.
                Esta acción necesita autorización.
              </p>

              {!PUBLICACION_TEXTOS_HABILITADA &&
                !PUBLICACION_IMAGENES_HABILITADA && (
                  <p
                    role="status"
                    className="mt-2 text-xs text-amber-800"
                  >
                    Por ahora puedes guardar y revisar. Para publicar, el administrador debe habilitar esta función.
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
                      Fotos pendientes de publicación: {imagenesPendientes.length}
                    </p>
                    <p className="mt-1 text-brand-600">
                      Textos que cambiarán: {evaluacionPublicacion.secciones.reduce(
                        (total, item) => total + item.textos.length, 0
                      )}
                    </p>

                    {imagenesPendientes.map((imagen) => (
                      <p
                        key={imagen.idSeccion}
                        className="mt-1 text-brand-600"
                      >
                        Fotografía guardada para revisión
                      </p>
                    ))}

                    {imagenesPendientes.length > 0 &&
                      !PUBLICACION_IMAGENES_HABILITADA && (
                        <p className="mt-2 text-amber-800">
                          Las fotos nuevas todavía no pueden hacerse públicas desde este entorno.
                        </p>
                      )}
                  </div>

                  {evaluacionPublicacion.secciones.map((seccion) => (
                    <div
                      key={seccion.idSeccion}
                      className="rounded border border-brand-100 p-3 text-xs"
                    >
                      <p className="font-semibold text-brand-800">
                        {nombreSeccion(seccion.codigo)}
                      </p>

                      {seccion.textos.map((texto) => (
                        <div
                          key={texto.campo}
                          className="mt-2 break-words"
                        >
                          <p className="font-medium text-brand-800">
                            {nombreCampo(texto.campo)}
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

                  <details className="text-xs text-brand-500">
                     <summary className="cursor-pointer">Detalles para soporte</summary>
                     Cambio {seleccionado.idBorrador} · Versión {seleccionado.revisionEdicion} · Versión pública {seleccionado.revisionBase}
                   </details>

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
                  className={'rounded-md bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50'}
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

          {/* LISTA DE BORRADORES */}

          <section className="mt-6 border-t border-brand-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-brand-900">
              Tus cambios guardados y pendientes de publicación
            </h3>

            {cargando && (
              <p className="text-sm text-brand-400">
                Cargando borradores...
              </p>
            )}

            {!cargando && pruebasInicio.length === 0 && (
              <p className="text-sm text-brand-400">
                Todavía no tienes cambios guardados. Cuando pulses Guardar, aparecerán aquí.
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
                  ? slidesAsociados.map((numero) => nombreZona(numero)).join(' · ')
                  : 'Zona no identificada';

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
                        Cambio guardado
                      </p>

                      <p className="mt-1 text-xs text-brand-500">
                        {etiquetaSlides}
                      </p>

                      <p className="mt-1 text-xs text-brand-500">
                        Guardado para revisión
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
                      {esSeleccionado ? 'Editando ahora' : 'Continuar edición'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

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
