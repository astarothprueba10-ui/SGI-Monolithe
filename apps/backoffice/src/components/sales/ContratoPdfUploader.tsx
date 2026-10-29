
import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Gate } from '../auth/PermissionRoute';
import {
  crmBackend,
  type CrmContractEvidence
} from '../../services/crmBackend';

interface ContratoPdfUploaderProps {
  idContrato: number;
  codigoContrato: string;
  onUploaded?: (evidencia: CrmContractEvidence) => void;
}

export function ContratoPdfUploader({
  idContrato,
  codigoContrato,
  onUploaded
}: ContratoPdfUploaderProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const contratoValido =
    Number.isSafeInteger(idContrato) && idContrato > 0;

  const subirPdf = async () => {
    if (!contratoValido) {
      toast.error('El contrato seleccionado no es válido.');
      return;
    }

    if (!archivo || subiendo) {
      return;
    }

    setSubiendo(true);

    try {
      const evidencia =
        await crmBackend.subirEvidenciaContrato(
          idContrato,
          archivo
        );

      if (!evidencia.success) {
        throw new Error(
          evidencia.mensaje ||
          'No se pudo registrar la evidencia.'
        );
      }

      toast.success(
        `PDF registrado: ${evidencia.codigoArchivo}`
      );

      setArchivo(null);
      setInputKey((actual) => actual + 1);

      onUploaded?.(evidencia);

    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No fue posible subir el documento.';

      toast.error(mensaje);

    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Gate permission="sales.edit">
      <div className="space-y-4 rounded-xl border border-brand-100 bg-white p-4">

        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-brand-800" />

          <div>
            <h3 className="text-sm font-semibold text-brand-900">
              Evidencia documental del contrato
            </h3>

            <p className="text-xs text-brand-500">
              Contrato: {codigoContrato}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="contrato-pdf"
            className="mb-2 block text-xs font-medium text-brand-700"
          >
            Seleccionar documento PDF
          </label>

          <input
            key={inputKey}
            id="contrato-pdf"
            type="file"
            accept=".pdf,application/pdf"
            disabled={subiendo || !contratoValido}
            onChange={(event) => {
              setArchivo(
                event.target.files?.[0] ?? null
              );
            }}
            className="block w-full rounded-lg border border-brand-200 p-2 text-xs text-brand-700"
          />
        </div>

        <p className="text-xs text-brand-500">
          Formato permitido: PDF. Tamaño máximo: 10 MB.
        </p>

        {archivo && (
          <p className="text-xs text-brand-700">
            Archivo seleccionado: {archivo.name}
          </p>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            El documento se registrará como evidencia
            pendiente de verificación. Su carga no
            confirma la firma ni activa el contrato.
          </p>
        </div>

        <button
          type="button"
          disabled={!archivo || subiendo || !contratoValido}
          onClick={subirPdf}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />

          {subiendo
            ? 'Subiendo documento...'
            : 'Subir PDF contractual'}
        </button>
      </div>
    </Gate>
  );
}
