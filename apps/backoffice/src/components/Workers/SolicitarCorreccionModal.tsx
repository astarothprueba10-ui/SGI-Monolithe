import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldLabel, Input, Select } from '../ui/Field';
import { coreService } from '../../services/coreService';
import { ApiError } from '../../lib/apiClient';
import type {
  TrabajadorResponse,
  CatalogosTrabajadorResponse,
  SolicitudCorreccionDocumentoRequest
} from '../../types/workers';
import { UploadIcon, AlertCircleIcon, FileImageIcon } from 'lucide-react';
import {
  clearIncompleteCorrection,
  correctionStorageKey,
  CORRECTION_EVIDENCE_MAX_SIZE as MAX_FILE_SIZE,
  CORRECTION_EVIDENCE_MIME_TYPES as ALLOWED_MIME_TYPES,
  saveIncompleteCorrection,
  type IncompleteCorrectionRequest as IncompleteRequest
} from './correctionDocumentUtils';

interface SolicitarCorreccionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trabajador: TrabajadorResponse | null;
  tiposDocumento: CatalogosTrabajadorResponse['tiposDocumento'];
}

export function SolicitarCorreccionModal({
  open,
  onClose,
  onSuccess,
  trabajador,
  tiposDocumento
}: SolicitarCorreccionModalProps) {
  const [idTipoDocumento, setIdTipoDocumento] = useState<number | ''>('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fase, setFase] = useState<'formulario' | 'subiendo_foto' | 'reintentar_foto'>('formulario');
  const [solicitudPendiente, setSolicitudPendiente] = useState<IncompleteRequest | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializacion y deteccion de solicitudes incompletas guardadas localmente
  useEffect(() => {
    function resetFromEffect() {
      setIdTipoDocumento('');
      setNumeroDocumento('');
      setMotivo('');
      setArchivo(null);
      setPreviewUrl(null);
      setEnviando(false);
      setFase('formulario');
      setSolicitudPendiente(null);
      setErrorLocal(null);
    }

    if (!open || !trabajador) {
      resetFromEffect();
      return;
    }

    const key = correctionStorageKey(trabajador.idTrabajador);
    const guardado = localStorage.getItem(key);
    if (guardado) {
      try {
        const parsed = JSON.parse(guardado) as IncompleteRequest;
        if (parsed.idTrabajador === trabajador.idTrabajador && parsed.idSolicitud) {
          setSolicitudPendiente(parsed);
          setFase('reintentar_foto');
          setIdTipoDocumento(parsed.idTipoDocumento);
          setNumeroDocumento(parsed.numeroDocumento);
          return;
        }
      } catch {
        localStorage.removeItem(key);
      }
    }

    resetFromEffect();
  }, [open, trabajador]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function limpiarEstado() {
    setIdTipoDocumento('');
    setNumeroDocumento('');
    setMotivo('');
    setArchivo(null);
    setPreviewUrl(null);
    setEnviando(false);
    setFase('formulario');
    setSolicitudPendiente(null);
    setErrorLocal(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Solo se admiten imagenes en formato JPG, PNG o WebP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo excede el tamano maximo permitido de 5 MB.');
      return;
    }

    setArchivo(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function descartarSolicitudIncompleta() {
    if (trabajador) {
      clearIncompleteCorrection(trabajador.idTrabajador);
    }
    limpiarEstado();
  }

  async function procesarSubidaEvidencia(idSolicitud: number, fileToUpload: File) {
    setFase('subiendo_foto');
    setEnviando(true);
    setErrorLocal(null);

    try {
      await coreService.adjuntarEvidenciaCorreccion(idSolicitud, fileToUpload);
      if (trabajador) {
        clearIncompleteCorrection(trabajador.idTrabajador);
      }
      toast.success('Solicitud de correccion documental enviada y evidencia registrada con exito.');
      limpiarEstado();
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error al subir la fotografia de respaldo.';
      setErrorLocal(msg);
      setFase('reintentar_foto');
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trabajador) return;

    if (fase === 'reintentar_foto' && solicitudPendiente) {
      if (!archivo) {
        toast.error('Debe seleccionar la fotografia de respaldo para completar la solicitud.');
        return;
      }
      await procesarSubidaEvidencia(solicitudPendiente.idSolicitud, archivo);
      return;
    }

    if (!idTipoDocumento) {
      toast.error('Seleccione el tipo de documento propuesto.');
      return;
    }

    const docLimpio = numeroDocumento.trim();
    if (!docLimpio) {
      toast.error('Ingrese el numero de documento propuesto.');
      return;
    }

    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 10 || motivoLimpio.length > 1000) {
      toast.error('El motivo debe contener entre 10 y 1000 caracteres.');
      return;
    }

    if (!archivo) {
      toast.error('Debe adjuntar la fotografia del documento (maximo 5 MB).');
      return;
    }

    setEnviando(true);
    setErrorLocal(null);

    const payload: SolicitudCorreccionDocumentoRequest = {
      idTipoDocumento: Number(idTipoDocumento),
      numeroDocumento: docLimpio,
      motivo: motivoLimpio
    };

    try {
      // Paso 1: Crear solicitud
      const res = await coreService.solicitarCorreccionDocumento(
        trabajador.idTrabajador,
        payload
      );

      const idSolicitud = res.idSolicitud;

      // Guardar en almacenamiento local para recuperacion ante fallas de red/foto
      const incompleto: IncompleteRequest = {
        idSolicitud,
        idTrabajador: trabajador.idTrabajador,
        idTipoDocumento: Number(idTipoDocumento),
        numeroDocumento: docLimpio,
        timestamp: Date.now()
      };
      saveIncompleteCorrection(incompleto);
      setSolicitudPendiente(incompleto);

      // Paso 2: Subir evidencia
      await procesarSubidaEvidencia(idSolicitud, archivo);
    } catch (err) {
      setEnviando(false);
      const msg = err instanceof ApiError ? err.message : 'No se pudo registrar la solicitud.';
      setErrorLocal(msg);
      toast.error(msg);
    }
  }

  if (!open || !trabajador) return null;

  const personal = trabajador.informacionPersonal;
  const tipoActualNombre = tiposDocumento.find(
    (t) => t.idTipoDocumento === personal.idTipoDocumento
  )?.nombre ?? 'Sin especificar';

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!enviando) onClose();
      }}
      title="Solicitar correccion documental"
      description="Inicia un tramite para rectificar el tipo o numero de documento de identidad con evidencia fotografica."
      width="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={enviando}
          >
            Cancelar
          </Button>

          {fase === 'reintentar_foto' && solicitudPendiente ? (
            <Button
              type="button"
              variant="primary"
              disabled={enviando || !archivo}
              onClick={handleSubmit}
            >
              {enviando ? 'Subiendo evidencia...' : 'Reintentar subida de evidencia'}
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={enviando}
              onClick={handleSubmit}
            >
              {enviando ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </Button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {/* Banner de recuperacion si existe solicitud incompleta */}
        {fase === 'reintentar_foto' && solicitudPendiente && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3.5 text-[13px] text-amber-800">
            <div className="flex items-start gap-2.5">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Solicitud #{solicitudPendiente.idSolicitud} pendiente de evidencia fotografica
                </p>
                <p className="text-[12px] text-amber-700">
                  Esta solicitud ya fue registrada en el sistema. Para evitar duplicados, adjunte el archivo de respaldo para finalizar el proceso.
                </p>
                <button
                  type="button"
                  onClick={descartarSolicitudIncompleta}
                  className="mt-1 text-[11px] font-medium text-amber-900 underline hover:text-amber-950"
                >
                  Descartar registro local e iniciar nueva solicitud
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Informacion actual del trabajador */}
        <div className="rounded-md border border-brand-100 bg-brand-50/60 p-3.5 text-[13px]">
          <p className="font-semibold text-brand-900">
            {personal.nombres} {personal.apellidoPaterno} {personal.apellidoMaterno ?? ''}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-2 text-[12px] text-brand-600">
            <div>
              <span className="font-medium text-brand-700">Tipo actual: </span>
              {tipoActualNombre}
            </div>
            <div>
              <span className="font-medium text-brand-700">Numero actual: </span>
              {personal.numeroDocumento ?? 'Sin documento'}
            </div>
          </div>
        </div>

        {/* Campos de rectificacion propuestos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="tipo-doc-propuesto">Nuevo tipo de documento</FieldLabel>
            <Select
              id="tipo-doc-propuesto"
              value={idTipoDocumento}
              onChange={(e) => setIdTipoDocumento(e.target.value ? Number(e.target.value) : '')}
              disabled={enviando || fase === 'reintentar_foto'}
              className="mt-1 w-full"
            >
              <option value="">Seleccione tipo...</option>
              {tiposDocumento.map((tipo) => (
                <option key={tipo.idTipoDocumento} value={tipo.idTipoDocumento}>
                  {tipo.nombre} ({tipo.codigo})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <FieldLabel htmlFor="num-doc-propuesto">Nuevo numero de documento</FieldLabel>
            <Input
              id="num-doc-propuesto"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
              placeholder="Ej. 72345678"
              disabled={enviando || fase === 'reintentar_foto'}
              className="mt-1 w-full"
            />
          </div>
        </div>

        {/* Motivo */}
        <div>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="motivo-correccion">Motivo de la correccion</FieldLabel>
            <span className={`text-[11px] ${motivo.length < 10 || motivo.length > 1000 ? 'text-amber-600' : 'text-brand-400'}`}>
              {motivo.length} / 1000 caracteres (minimo 10)
            </span>
          </div>
          <textarea
            id="motivo-correccion"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={enviando || fase === 'reintentar_foto'}
            placeholder="Explique detalladamente el motivo de la correccion documental..."
            className="mt-1 w-full rounded-md border border-brand-200 px-3 py-2 text-[13px] text-brand-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-brand-50"
          />
        </div>

        {/* Adjuntar evidencia fotografica */}
        <div>
          <FieldLabel >Fotografia de evidencia (JPG, PNG o WebP, max. 5 MB)</FieldLabel>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-brand-200 bg-brand-50/30 p-4 transition-colors hover:border-brand-400 hover:bg-brand-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {archivo ? (
              <div className="flex flex-col items-center gap-2 text-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Previsualizacion"
                    className="h-28 max-w-full rounded object-contain border border-brand-200"
                  />
                ) : (
                  <FileImageIcon className="h-8 w-8 text-brand-600" />
                )}
                <div className="text-[12px] font-medium text-brand-900">{archivo.name}</div>
                <div className="text-[11px] text-brand-400">
                  {(archivo.size / (1024 * 1024)).toFixed(2)} MB — Clic para cambiar imagen
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <UploadIcon className="h-6 w-6 text-brand-400" />
                <span className="text-[12px] font-medium text-brand-700">
                  Haga clic para seleccionar la imagen de respaldo
                </span>
                <span className="text-[11px] text-brand-400">
                  Archivos admitidos: JPG, PNG o WebP de hasta 5 MB
                </span>
              </div>
            )}
          </div>
        </div>

        {errorLocal && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[12px] text-rose-700">
            {errorLocal}
          </div>
        )}
      </form>
    </Modal>
  );
}
