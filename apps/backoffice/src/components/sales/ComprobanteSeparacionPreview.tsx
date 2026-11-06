import { useEffect, useState } from 'react';
import { ExternalLinkIcon, FileImageIcon, FileTextIcon, LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { crmBackend, type CrmVoucherReadUrl } from '../../services/crmBackend';
import { ApiError } from '../../lib/apiClient';

interface ComprobanteSeparacionPreviewProps {
  idReserva: number;
}

export function ComprobanteSeparacionPreview({ idReserva }: ComprobanteSeparacionPreviewProps) {
  const [comprobante, setComprobante] = useState<CrmVoucherReadUrl | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinArchivo, setSinArchivo] = useState(false);
  const [error, setError] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [intento, setIntento] = useState(0);
  const [miniaturaError, setMiniaturaError] = useState(false);

  useEffect(() => {
    let vigente = true;
    setComprobante(null);
    setSinArchivo(false);
    setError(false);
    setMiniaturaError(false);
    setCargando(true);

    void crmBackend.obtenerComprobanteSeparacion(idReserva)
      .then((datos) => {
        if (vigente) setComprobante(datos);
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        if (err instanceof ApiError && err.status === 404) {
          setSinArchivo(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [idReserva, intento]);

  const abrirComprobante = async () => {
    if (!comprobante || abriendo) return;

    // Abrir la pestaña durante el clic para evitar bloqueos de ventanas emergentes.
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      toast.error('Habilita las ventanas emergentes para visualizar el comprobante.');
      return;
    }
    ventana.opener = null;
    setAbriendo(true);
    try {
      // Renovar el enlace al hacer clic, aunque la miniatura lleve abierta
      // mas de los cinco minutos de validez del enlace de Storage.
      const enlace = await crmBackend.obtenerComprobanteSeparacion(idReserva);
      ventana.location.replace(enlace.urlDescarga);
      setComprobante(enlace);
      setMiniaturaError(false);
    } catch (err: unknown) {
      ventana.close();
      toast.error('No se pudo abrir el comprobante', {
        description: err instanceof Error ? err.message : 'Intenta nuevamente.'
      });
    } finally {
      setAbriendo(false);
    }
  };

  const mime = comprobante?.tipoMime.toLowerCase() ?? '';
  const esImagen = ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
  const esPdf = mime === 'application/pdf';

  return (
    <section className="border-t border-brand-100 pt-4">
      <h3 className="mb-2 text-sm font-semibold text-brand-900">
        Comprobante de separación
      </h3>
      <p className="mb-3 text-xs text-brand-500">
        Selecciona la miniatura para visualizar el archivo original.
      </p>

      {cargando ? (
        <div className="flex items-center gap-2 py-4 text-xs text-brand-500">
          <LoaderCircleIcon className="h-4 w-4 animate-spin" />
          Cargando comprobante...
        </div>
      ) : comprobante ? (
        <button
          type="button"
          onClick={() => void abrirComprobante()}
          disabled={abriendo}
          className="group flex w-full items-center gap-4 rounded-lg border border-brand-200 bg-brand-50/30 p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-70"
          aria-label={'Visualizar comprobante ' + comprobante.nombreArchivo}
          title="Abrir comprobante en una pestaña nueva"
        >
          <div className="flex h-28 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brand-200 bg-white">
            {esImagen && !miniaturaError ? (
              <img
                src={comprobante.urlDescarga}
                alt={'Miniatura de ' + comprobante.nombreArchivo}
                className="h-full w-full object-contain"
                loading="lazy"
                onError={() => setMiniaturaError(true)}
              />
            ) : esPdf ? (
              <div className="flex flex-col items-center gap-1 text-rose-700">
                <FileTextIcon className="h-12 w-12" />
                <span className="text-xs font-semibold">PDF</span>
              </div>
            ) : (
              <FileImageIcon className="h-10 w-10 text-brand-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-semibold text-brand-900">
              {comprobante.nombreArchivo}
            </p>
            <p className="mt-1 text-xs text-brand-500">
              {esPdf ? 'Documento PDF' : esImagen ? 'Imagen' : 'Archivo adjunto'}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 group-hover:text-brand-900">
              {abriendo ? 'Abriendo...' : 'Ver archivo original'}
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      ) : sinArchivo ? (
        <p className="rounded-md border border-brand-100 bg-brand-50/30 p-3 text-xs text-brand-500">
          Esta separación no tiene un comprobante disponible.
        </p>
      ) : error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          No se pudo consultar el comprobante.
          <button
            type="button"
            onClick={() => setIntento((actual) => actual + 1)}
            className="ml-2 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </section>
  );
}
