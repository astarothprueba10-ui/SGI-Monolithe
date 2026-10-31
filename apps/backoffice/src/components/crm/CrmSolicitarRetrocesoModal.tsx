import { useState, useEffect, useRef, useId } from 'react';
import { toast } from 'sonner';
import { Upload, X, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import {
  crmBackend,
  type CrmProspect,
  type CrmRetrocesoMotivo,
  type CrmSolicitudRetroceso
} from '../../services/crmBackend';

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  open: boolean;
  onClose: () => void;
  prospecto: CrmProspect | null;
  etapaDestinoCodigo: string;
  etapaDestinoNombre: string;
  motivos?: CrmRetrocesoMotivo[];
  onSuccess: () => void;
}

export function CrmSolicitarRetrocesoModal({
  open,
  onClose,
  prospecto,
  etapaDestinoCodigo,
  etapaDestinoNombre,
  motivos = [],
  onSuccess
}: Props) {
  const [motivoCodigo, setMotivoCodigo] = useState('');
  const [explicacion, setExplicacion] = useState('');
  const [catalogoMotivos, setCatalogoMotivos] = useState<CrmRetrocesoMotivo[]>(motivos);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [solicitudIdCargada, setSolicitudIdCargada] = useState<number | null>(null);
  const [solicitudPendiente, setSolicitudPendiente] = useState<CrmSolicitudRetroceso | null>(null);
  const [buscandoPendiente, setBuscandoPendiente] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const resetState = () => {
    setMotivoCodigo('');
    setExplicacion('');
    setArchivo(null);
    setPreviewUrl(null);
    setErrors({});
    setSolicitudIdCargada(null);
    setSolicitudPendiente(null);
  };

  useEffect(() => {
    if (!open || !prospecto) {
      resetState();
      return;
    }
    setBuscandoPendiente(true);
    crmBackend.retrocesos.miRetrocesoPendiente(prospecto.id_prospecto)
      .then((res) => {
        if (res && res.id_solicitud) {
          setSolicitudPendiente(res);
          setSolicitudIdCargada(res.id_solicitud);
        }
      })
      .catch(() => {})
      .finally(() => setBuscandoPendiente(false));

    if (motivos && motivos.length > 0) {
      setCatalogoMotivos(motivos);
    } else {
      crmBackend.retrocesos.motivos()
        .then((m) => setCatalogoMotivos(m || []))
        .catch(() => {});
    }
  }, [open, prospecto, motivos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!EXTENSIONES.includes(file.type.toLowerCase())) {
      setErrors((prev) => ({ ...prev, archivo: 'Solo se permiten imagenes JPG, PNG o WebP.' }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setErrors((prev) => ({ ...prev, archivo: 'La imagen no puede superar 5 MB.' }));
      return;
    }

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.archivo;
      return copy;
    });
    setArchivo(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const removeFile = () => {
    setArchivo(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!solicitudPendiente) {
      if (!motivoCodigo) e.motivo = 'Seleccione un motivo.';
      if (explicacion.trim().length < 15) e.explicacion = 'Minimo 15 caracteres.';
      if (explicacion.trim().length > 1000) e.explicacion = 'Maximo 1000 caracteres.';
    }
    if (!archivo) e.archivo = 'Debe adjuntar una imagen de evidencia fotográfica.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const subirEvidencia = async (idSolicitud: number) => {
    if (!archivo) return;
    try {
      await crmBackend.retrocesos.adjuntarEvidencia(idSolicitud, archivo);
      toast.success('Evidencia adjuntada', {
        description: `Se adjunto correctamente la fotografia a la solicitud #${idSolicitud}.`
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fallo la carga de la fotografia.';
      toast.error('Error al subir imagen', {
        description: `${msg} Puede reintentar cargar la imagen sin crear otra solicitud.`
      });
      setSolicitudIdCargada(idSolicitud);
    }
  };

  const handleSubmit = async () => {
    if (!prospecto || !validate()) return;
    setSubmitting(true);
    try {
      if (solicitudIdCargada) {
        await subirEvidencia(solicitudIdCargada);
      } else {
        const res = await crmBackend.retrocesos.solicitarRetroceso(prospecto.id_prospecto, {
          estadoDestinoCodigo: etapaDestinoCodigo,
          motivoCodigo,
          motivoDetallado: explicacion.trim(),
        });
        const nuevoId = res.id_solicitud;
        setSolicitudIdCargada(nuevoId);
        await subirEvidencia(nuevoId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la solicitud.';
      toast.error('Error en solicitud', { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!prospecto) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={solicitudPendiente ? 'Adjuntar evidencia pendiente' : 'Solicitar retroceso de etapa'}
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || buscandoPendiente}>
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Procesando...
              </>
            ) : solicitudPendiente ? (
              'Adjuntar evidencia pendiente'
            ) : solicitudIdCargada ? (
              'Reintentar carga de evidencia'
            ) : (
              'Enviar solicitud con evidencia'
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {buscandoPendiente && (
          <div className="flex items-center text-xs text-brand-600 gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Comprobando solicitudes pendientes del prospecto...</span>
          </div>
        )}

        {solicitudPendiente && (
          <Alert tone="warning" title="Solicitud pendiente detectada">
            El prospecto ya cuenta con la solicitud #{solicitudPendiente.id_solicitud} en estado PENDIENTE.
            Adjunte la evidencia requerida para completar el expediente.
          </Alert>
        )}

        {solicitudIdCargada && !solicitudPendiente && (
          <Alert tone="warning" title="Solicitud registrada sin imagen">
            La solicitud #{solicitudIdCargada} fue guardada. Debe cargar la imagen de evidencia para que Gerencia pueda evaluarla.
          </Alert>
        )}

        <div className="text-sm text-slate-600 space-y-1 bg-slate-50 p-3 rounded-md">
          <div><span className="font-medium">Prospecto:</span> {prospecto.nombre_completo} ({prospecto.codigo})</div>
          <div><span className="font-medium">Etapa actual:</span> {prospecto.estado_nombre || prospecto.estado_codigo}</div>
          <div><span className="font-medium">Etapa solicitada:</span> {solicitudPendiente?.nombre_etapa_destino || etapaDestinoNombre}</div>
        </div>

        {!solicitudPendiente && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo de retroceso <span className="text-rose-500">*</span>
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={motivoCodigo}
                onChange={(e) => setMotivoCodigo(e.target.value)}
                disabled={submitting || Boolean(solicitudIdCargada)}
              >
                <option value="">Seleccione un motivo</option>
                {catalogoMotivos.map((m) => (
                  <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
                ))}
              </select>
              {errors.motivo && <p className="mt-1 text-xs text-rose-600">{errors.motivo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Explicacion detallada <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={3}
                value={explicacion}
                onChange={(e) => setExplicacion(e.target.value)}
                disabled={submitting || Boolean(solicitudIdCargada)}
                placeholder="Describa el motivo con detalle (minimo 15 caracteres)"
                maxLength={1000}
              />
              <div className="flex justify-between mt-0.5">
                {errors.explicacion
                  ? <p className="text-xs text-rose-600">{errors.explicacion}</p>
                  : <span />}
                <span className="text-xs text-slate-400">{explicacion.length}/1000</span>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Evidencia fotografica <span className="text-rose-500">*</span>
            <span className="text-xs text-slate-400 font-normal ml-2">(JPG, PNG, WebP - max. 5 MB)</span>
          </label>

          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={submitting}
          />

          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-brand-50/20"
            >
              <Upload className="h-7 w-7 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-brand-700">Seleccionar fotografia de evidencia</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Haga clic para examinar sus archivos</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <ImageIcon className="h-4 w-4 text-brand-600 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 truncate">{archivo?.name}</span>
                  <span className="text-[11px] text-slate-400">({(archivo ? archivo.size / 1024 : 0).toFixed(0)} KB)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-brand-600 hover:text-brand-800 underline"
                    disabled={submitting}
                  >
                    Sustituir
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-xs text-rose-600 hover:text-rose-800 p-0.5 rounded hover:bg-rose-50"
                    disabled={submitting}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-hidden rounded border border-slate-100 flex items-center justify-center bg-slate-900/5">
                <img src={previewUrl} alt="Vista previa de evidencia" className="max-h-48 object-contain rounded" />
              </div>
            </div>
          )}

          {errors.archivo && (
            <div className="flex items-center gap-1 mt-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errors.archivo}</span>
            </div>
          )}
        </div>

        <Alert tone="info" title="Regla de aprobacion">
          La solicitud se mantendra en estado PENDIENTE. Gerencia o Supervisor comercial requiere la evidencia fotografica para evaluar y aprobar el retroceso.
        </Alert>
      </div>
    </Modal>
  );
}
