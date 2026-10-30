import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { validarImagenLocal } from '../../services/cmsImagePreview';
import { imagenNoRegistrada, revisionImagenConfirmada } from '../../services/cmsImageDraftContract';
import { webContentDraftImageService } from '../../services/webContentDraftImageService';
import type { BorradorCms } from '../../services/webContentDraftService';
import { proyectarBorradorPagina, type SeccionCmsPreview } from '../../services/cmsPreview';
import { CmsHeroVisualPreview } from './CmsHeroVisualPreview';

type Vista = 'escritorio' | 'movil';

export function CmsDraftPreview({ seccion, borrador, cerrar, puedeEditar, cambioRevision }: {
  seccion: SeccionCmsPreview; borrador: BorradorCms; cerrar: () => void;
  puedeEditar: boolean; cambioRevision: (revision: number) => void;
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
    if (urlLocal.current) URL.revokeObjectURL(urlLocal.current);
    urlLocal.current = null;
    setArchivoLocal(null);
    setImagenTemporal(null);
    if (selectorImagen.current) selectorImagen.current.value = '';
  }

  function quitarGuardadaLocal() {
    if (urlGuardada.current) URL.revokeObjectURL(urlGuardada.current);
    urlGuardada.current = null;
    setImagenGuardada(null);
  }

  function seleccionarImagen(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0] ?? null;
    evento.target.value = '';
    if (!archivo) return;
    const error = validarImagenLocal(archivo);
    if (error) { setErrorImagen(error); return; }
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
      const blob = await webContentDraftImageService.recuperar(borrador.idBorrador, seccion.idSeccion);
      if (actual !== peticion.current) return false;
      quitarGuardadaLocal();
      urlGuardada.current = URL.createObjectURL(blob);
      setImagenGuardada(urlGuardada.current);
      setHayGuardada(true);
      return true;
    } catch (error: unknown) {
      if (actual !== peticion.current) return false;
      quitarGuardadaLocal();
      if (imagenNoRegistrada(error)) setHayGuardada(false);
      else setErrorImagen(describirError(error));
      return false;
    } finally {
      if (actual === peticion.current) setCargandoImagen(false);
    }
  }

  useEffect(() => {
    void recuperarGuardada();
    return () => {
      ++peticion.current;
      if (urlLocal.current) URL.revokeObjectURL(urlLocal.current);
      if (urlGuardada.current) URL.revokeObjectURL(urlGuardada.current);
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
        borrador.idBorrador, seccion.idSeccion, borrador.revisionEdicion, archivoLocal
      );
      cambioRevision(revisionImagenConfirmada(resultado,
        borrador.idBorrador, seccion.idSeccion, borrador.revisionEdicion));
      setHayGuardada(true);
      setMensajeImagen('Imagen guardada en el borrador privado. No está publicada.');
      if (await recuperarGuardada()) quitarLocal();
    } catch (error: unknown) {
      setErrorImagen(describirError(error));
    } finally {
      setOcupado(false);
    }
  }

  async function retirarGuardada() {
    if (ocupado || !hayGuardada || cargandoImagen) return;
    if (!window.confirm('¿Retirar la imagen guardada de este borrador privado?')) return;
    setOcupado(true);
    setErrorImagen('');
    setMensajeImagen('');
    try {
      const resultado = await webContentDraftImageService.quitar(
        borrador.idBorrador, seccion.idSeccion, borrador.revisionEdicion
      );
      cambioRevision(revisionImagenConfirmada(resultado,
        borrador.idBorrador, seccion.idSeccion, borrador.revisionEdicion));
      quitarGuardadaLocal();
      setHayGuardada(false);
      setMensajeImagen('Imagen retirada del borrador. La página pública sigue intacta.');
    } catch (error: unknown) {
      setErrorImagen(describirError(error));
    } finally {
      setOcupado(false);
    }
  }

  function errorCargaImagen() {
    if (imagenTemporal) quitarLocal();
    else quitarGuardadaLocal();
    setErrorImagen('No se pudo visualizar la imagen. Comprueba su formato o recupera la guardada.');
  }

  const datos = proyectarBorradorPagina(seccion, borrador);
  if (!datos) {
    return <p role="alert" className="rounded-md border border-rose-200 p-3 text-sm text-rose-700">
      El borrador no contiene cambios válidos para esta sección de Inicio.
    </p>;
  }

  const cambios = Object.values(datos).filter((c) => c.modificado).length;
  const buttonClass = 'rounded-md border border-brand-200 bg-white px-3 py-2 text-xs text-brand-800 disabled:opacity-50';

  return (
    <section aria-label="Previsualización privada del borrador" className="mt-6 rounded-lg border border-brand-200 bg-brand-50/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-900">Previsualización privada · Borrador #{borrador.idBorrador}</h3>
          <p className="mt-1 text-xs text-brand-500">Revisión guardada {borrador.revisionEdicion} · {cambios} campo(s) diferente(s) del CMS actual</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={vista === 'escritorio'} onClick={() => setVista('escritorio')}
            className={`rounded-md border px-3 py-2 text-xs ${vista === 'escritorio' ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-brand-800'}`}>
            Escritorio
          </button>
          <button type="button" aria-pressed={vista === 'movil'} onClick={() => setVista('movil')}
            className={`rounded-md border px-3 py-2 text-xs ${vista === 'movil' ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-brand-800'}`}>
            Móvil
          </button>
          <button type="button" onClick={cerrar} disabled={ocupado} className={buttonClass}>Cerrar vista previa</button>
        </div>
      </div>
      <div className="mb-4 rounded-md border border-brand-200 bg-white p-3">
        <label htmlFor="imagen-local-cms" className="block text-sm font-medium text-brand-800">
          Imagen promocional del borrador (sin publicar)
        </label>
        <input id="imagen-local-cms" ref={selectorImagen} type="file" disabled={!puedeEditar || ocupado}
          accept="image/jpeg,image/png,image/webp" onChange={seleccionarImagen}
          className="mt-2 block w-full min-w-0 text-xs text-brand-700 file:mr-3 file:rounded-md file:border file:border-brand-200 file:bg-white file:px-3 file:py-2"
        />
        <p className="mt-2 text-xs text-brand-500">
          JPG, PNG o WebP, máximo 5 MB. Seleccionar solo previsualiza; utiliza «Guardar imagen en borrador» para persistirla de forma privada.
        </p>
        {archivoLocal && <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-brand-700">
          <span className="break-all">Seleccionada (sin guardar): {archivoLocal.name}</span>
          <button type="button" onClick={quitarLocal} disabled={ocupado} className={buttonClass}>Quitar imagen local</button>
        </div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClass}
            disabled={!puedeEditar || !archivoLocal || ocupado || cargandoImagen}
            onClick={() => void guardarImagen()}>Guardar imagen en borrador</button>
          <button type="button" className={buttonClass} disabled={ocupado || cargandoImagen}
            onClick={() => void recuperarGuardada()}>Recuperar imagen guardada</button>
          <button type="button" className={buttonClass}
            disabled={!puedeEditar || !hayGuardada || ocupado || cargandoImagen}
            onClick={() => void retirarGuardada()}>Retirar imagen del borrador</button>
        </div>
        {cargandoImagen && <p role="status" className="mt-2 text-xs text-brand-600">Comprobando imagen privada guardada...</p>}
        {!cargandoImagen && !hayGuardada && !errorImagen && <p className="mt-2 text-xs text-brand-500">No hay imagen guardada para esta sección del borrador.</p>}
        {mensajeImagen && <p role="status" className="mt-2 text-xs text-emerald-700">{mensajeImagen}</p>}
        {errorImagen && <p role="alert" className="mt-2 text-xs text-rose-700">{errorImagen}</p>}
      </div>
      <div className={`grid gap-4 ${vista === 'movil' ? 'lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-brand-700">Contenido actual del CMS</p>
          <CmsHeroVisualPreview datos={datos} esBorrador={false} movil={vista === 'movil'}
            fondoPrincipal={seccion.codigo === 'HERO_PRINCIPAL'} />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-brand-700">Contenido con borrador (no publicado)</p>
          <CmsHeroVisualPreview datos={datos} esBorrador movil={vista === 'movil'}
            fondoPrincipal={seccion.codigo === 'HERO_PRINCIPAL'}
            imagenLocal={imagenTemporal} imagenGuardada={imagenGuardada} onErrorImagen={errorCargaImagen} />
        </div>
      </div>
      {!seccion.visible && <p className="mt-3 text-xs text-amber-800">La sección CMS está marcada como no visible actualmente.</p>}
      <p className="mt-4 text-xs leading-relaxed text-brand-500">
        Representación editorial privada del slide seleccionado. Las secciones promocionales 2 y 3 aún no tienen
        una versión pública equivalente; por eso usan fondo neutro si no se seleccionó imagen. Los controles son decorativos;
        la vista no navega ni publica. El slide principal conserva su fotografía de referencia original.
        Las imágenes del borrador se descargan solo mediante Java con JWT.
        El carrusel público no cambia mediante esta pantalla.
      </p>
    </section>
  );
}

function describirError(error: unknown): string {
  if (error && typeof error === 'object' && 'status' in error && error.status === 409) {
    return 'El borrador cambió en otra sesión. Cierra la vista, recarga la lista y vuelve a seleccionarlo.';
  }
  return error instanceof Error ? error.message : 'No fue posible completar la operación.';
}
