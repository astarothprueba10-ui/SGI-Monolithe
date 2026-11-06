import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { validarImagenLocal } from '../../services/cmsImagePreview';
import {
  imagenNoRegistrada,
  revisionImagenConfirmada
} from '../../services/cmsImageDraftContract';
import { webContentDraftImageService } from '../../services/webContentDraftImageService';
import type { BorradorCms } from '../../services/webContentDraftService';
import {
  proyectarBorradorPagina,
  type SeccionCmsPreview
} from '../../services/cmsPreview';
import { CmsHeroVisualPreview } from './CmsHeroVisualPreview';

type Vista = 'escritorio' | 'movil';

export function CmsDraftPreview({
  seccion,
  borrador,
  cerrar,
  puedeEditar,
  cambioRevision
}: {
  seccion: SeccionCmsPreview;
  borrador: BorradorCms;
  cerrar: () => void;
  puedeEditar: boolean;
  cambioRevision: (revision: number) => void;
}) {
  const [vista, setVista] = useState<Vista>('escritorio');

  const [imagenTemporal, setImagenTemporal] = useState<string | null>(null);
  const [archivoLocal, setArchivoLocal] = useState<File | null>(null);
  const [imagenGuardada, setImagenGuardada] = useState<string | null>(null);

  const [hayGuardada, setHayGuardada] = useState(false);
  const [cargandoImagen, setCargandoImagen] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const [errorImagen, setErrorImagen] = useState('');
  const [mensajeImagen, setMensajeImagen] = useState('');

  const urlLocal = useRef<string | null>(null);
  const urlGuardada = useRef<string | null>(null);
  const peticion = useRef(0);
  const selectorImagen = useRef<HTMLInputElement>(null);

  function quitarLocal() {
    if (urlLocal.current) {
      URL.revokeObjectURL(urlLocal.current);
    }

    urlLocal.current = null;

    setArchivoLocal(null);
    setImagenTemporal(null);

    if (selectorImagen.current) {
      selectorImagen.current.value = '';
    }
  }

  function quitarGuardadaLocal() {
    if (urlGuardada.current) {
      URL.revokeObjectURL(urlGuardada.current);
    }

    urlGuardada.current = null;
    setImagenGuardada(null);
  }

  function seleccionarImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0] ?? null;

    evento.target.value = '';

    if (!archivo) return;

    const error = validarImagenLocal(archivo);

    if (error) {
      setErrorImagen(error);
      return;
    }

    quitarLocal();

    urlLocal.current = URL.createObjectURL(archivo);

    setImagenTemporal(urlLocal.current);
    setArchivoLocal(archivo);

    setErrorImagen('');
    setMensajeImagen('');
  }

  async function recuperarGuardada(): Promise<boolean> {
    const actual = ++peticion.current;

    setCargandoImagen(true);
    setErrorImagen('');

    try {
      const blob = await webContentDraftImageService.recuperar(
        borrador.idBorrador,
        seccion.idSeccion
      );

      if (actual !== peticion.current) return false;

      quitarGuardadaLocal();

      urlGuardada.current = URL.createObjectURL(blob);

      setImagenGuardada(urlGuardada.current);
      setHayGuardada(true);

      return true;

    } catch (error: unknown) {
      if (actual !== peticion.current) return false;

      quitarGuardadaLocal();

      if (imagenNoRegistrada(error)) {
        setHayGuardada(false);
      } else {
        setErrorImagen(describirError(error));
      }

      return false;

    } finally {
      if (actual === peticion.current) {
        setCargandoImagen(false);
      }
    }
  }

  useEffect(() => {
    void recuperarGuardada();

    return () => {
      ++peticion.current;

      if (urlLocal.current) {
        URL.revokeObjectURL(urlLocal.current);
      }

      if (urlGuardada.current) {
        URL.revokeObjectURL(urlGuardada.current);
      }

      urlLocal.current = null;
      urlGuardada.current = null;
    };
  }, [borrador.idBorrador, seccion.idSeccion]);

  async function guardarImagen() {
    if (!archivoLocal || ocupado || cargandoImagen) return;

    setOcupado(true);
    setErrorImagen('');
    setMensajeImagen('');

    try {
      const resultado = await webContentDraftImageService.guardar(
        borrador.idBorrador,
        seccion.idSeccion,
        borrador.revisionEdicion,
        archivoLocal
      );

      cambioRevision(
        revisionImagenConfirmada(
          resultado,
          borrador.idBorrador,
          seccion.idSeccion,
          borrador.revisionEdicion
        )
      );

      setHayGuardada(true);

      setMensajeImagen(
        'Imagen guardada en el borrador privado. No está publicada.'
      );

      if (await recuperarGuardada()) {
        quitarLocal();
      }

    } catch (error: unknown) {
      setErrorImagen(describirError(error));

    } finally {
      setOcupado(false);
    }
  }

  async function retirarGuardada() {
    if (ocupado || !hayGuardada || cargandoImagen) return;

    if (
      !window.confirm(
        '¿Retirar la imagen guardada de este borrador privado?'
      )
    ) {
      return;
    }

    setOcupado(true);
    setErrorImagen('');
    setMensajeImagen('');

    try {
      const resultado = await webContentDraftImageService.quitar(
        borrador.idBorrador,
        seccion.idSeccion,
        borrador.revisionEdicion
      );

      cambioRevision(
        revisionImagenConfirmada(
          resultado,
          borrador.idBorrador,
          seccion.idSeccion,
          borrador.revisionEdicion
        )
      );

      quitarGuardadaLocal();

      setHayGuardada(false);

      setMensajeImagen(
        'Imagen retirada del borrador. La página pública sigue intacta.'
      );

    } catch (error: unknown) {
      setErrorImagen(describirError(error));

    } finally {
      setOcupado(false);
    }
  }

  function errorCargaImagen() {
    if (imagenTemporal) {
      quitarLocal();
    } else {
      quitarGuardadaLocal();
    }

    setErrorImagen(
      'No se pudo visualizar la imagen. Comprueba su formato o recupera la guardada.'
    );
  }

  const datos = proyectarBorradorPagina(seccion, borrador);

  if (!datos) {
    return (
      <p
        role="alert"
        className="rounded-md border border-rose-200 p-3 text-sm text-rose-700"
      >
        El borrador no contiene cambios válidos para esta sección de Inicio.
      </p>
    );
  }

  const cambios = Object.values(datos).filter(
    (campo) => campo.modificado
  ).length;

  const buttonClass =
    'rounded-md border border-brand-200 bg-white px-3 py-2 text-xs text-brand-800 disabled:opacity-50';

  return (
    <section
      aria-label="Previsualización privada del borrador"
      className="mt-6 rounded-lg border border-brand-200 bg-brand-50/40 p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-900">
            Así quedará tu página · Aún no publicado
          </h3>

          <p className="mt-1 text-xs text-brand-500">
            Revisa el resultado antes de publicarlo. Has modificado {cambios} campo(s).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={vista === 'escritorio'}
            onClick={() => setVista('escritorio')}
            className={`rounded-md border px-3 py-2 text-xs ${vista === 'escritorio'
                ? 'border-brand-700 bg-brand-900 text-white'
                : 'border-brand-200 bg-white text-brand-800'
              }`}
          >
            Escritorio
          </button>

          <button
            type="button"
            aria-pressed={vista === 'movil'}
            onClick={() => setVista('movil')}
            className={`rounded-md border px-3 py-2 text-xs ${vista === 'movil'
                ? 'border-brand-700 bg-brand-900 text-white'
                : 'border-brand-200 bg-white text-brand-800'
              }`}
          >
            Móvil
          </button>

          <button
            type="button"
            onClick={cerrar}
            disabled={ocupado}
            className={buttonClass}
          >
            Cerrar vista previa
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-md border border-brand-200 bg-white p-3">
        <label
          htmlFor="imagen-local-cms"
          className="block text-sm font-medium text-brand-800"
        >
          ¿Quieres cambiar también la fotografía?
        </label>

        <input
          id="imagen-local-cms"
          ref={selectorImagen}
          type="file"
          disabled={!puedeEditar || ocupado}
          accept="image/jpeg,image/png,image/webp"
          onChange={seleccionarImagen}
          className="mt-2 block w-full min-w-0 text-xs text-brand-700 file:mr-3 file:rounded-md file:border file:border-brand-200 file:bg-white file:px-3 file:py-2"
        />

        <p className="mt-2 text-xs text-brand-500">
          Elige una foto JPG, PNG o WebP de hasta 5 MB.
          Después pulsa «Guardar esta foto» para conservarla junto a tus cambios.
        </p>

        {archivoLocal && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-brand-700">
            <span className="break-all">
              Foto elegida (todavía sin guardar): {archivoLocal.name}
            </span>

            <button
              type="button"
              onClick={quitarLocal}
              disabled={ocupado}
              className={buttonClass}
            >
              Cancelar selección de foto
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={
              !puedeEditar || !archivoLocal || ocupado || cargandoImagen
            }
            onClick={() => void guardarImagen()}
          >
            Guardar esta foto
          </button>

          <button
            type="button"
            className={buttonClass}
            disabled={ocupado || cargandoImagen}
            onClick={() => void recuperarGuardada()}
          >
            Ver foto guardada
          </button>

          <button
            type="button"
            className={buttonClass}
            disabled={
              !puedeEditar || !hayGuardada || ocupado || cargandoImagen
            }
            onClick={() => void retirarGuardada()}
          >
            Quitar foto guardada
          </button>
        </div>

        {cargandoImagen && (
          <p role="status" className="mt-2 text-xs text-brand-600">
            Buscando la foto que guardaste...
          </p>
        )}

        {!cargandoImagen && !hayGuardada && !errorImagen && (
          <p className="mt-2 text-xs text-brand-500">
            Todavía no has guardado una foto nueva para esta zona.
          </p>
        )}

        {mensajeImagen && (
          <p role="status" className="mt-2 text-xs text-emerald-700">
            {mensajeImagen}
          </p>
        )}

        {errorImagen && (
          <p role="alert" className="mt-2 text-xs text-rose-700">
            {errorImagen}
          </p>
        )}
      </div>

      <div
        className={`grid gap-4 ${vista === 'movil' ? 'lg:grid-cols-2' : 'xl:grid-cols-2'
          }`}
      >
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-brand-700">
            Así se ve ahora
          </p>

          <CmsHeroVisualPreview
            datos={datos}
            codigoSeccion={seccion.codigo}
            esBorrador={false}
            movil={vista === 'movil'}
          />
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-brand-700">
            Así se verá con tus cambios
          </p>

          <CmsHeroVisualPreview
            datos={datos}
            codigoSeccion={seccion.codigo}
            esBorrador
            movil={vista === 'movil'}
            imagenLocal={imagenTemporal}
            imagenGuardada={imagenGuardada}
            onErrorImagen={errorCargaImagen}
          />
        </div>
      </div>

      {!seccion.visible && (
        <p className="mt-3 text-xs text-amber-800">
          Esta parte de la página no está visible para los visitantes.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-brand-500">
        Esta comparación es privada. Elegir y guardar una fotografía aquí no la publica.
        Los precios, los títulos comerciales protegidos y la información oficial del proyecto no se modifican.
      </p>
    </section>
  );
}

function describirError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    error.status === 409
  ) {
    return 'El borrador cambió en otra sesión. Cierra la vista, recarga la lista y vuelve a seleccionarlo.';
  }

  return error instanceof Error
    ? error.message
    : 'No fue posible completar la operación.';
}