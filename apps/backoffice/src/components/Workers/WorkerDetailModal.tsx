import { useEffect, useState } from 'react';
import { DownloadIcon } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Gate } from '../auth/PermissionRoute';
import { coreService } from '../../services/coreService';
import type { CatalogosTrabajadorResponse, TrabajadorResponse } from '../../types/workers';
import { formatWorkerDate } from './workerForm';
import { WorkerFichaPDF } from './WorkerFichaPDF';

interface WorkerDetailModalProps {
  open: boolean;
  workerId: number | null;
  onClose: () => void;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-brand-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-[13px] text-brand-800">{value?.trim() || '—'}</dd>
    </div>
  );
}

function verifiedLabel(value: boolean | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  return value ? 'Verificado' : 'Pendiente de verificación';
}

async function generateAndDownloadWorkerPdf(
  worker: TrabajadorResponse,
  catalogs?: CatalogosTrabajadorResponse | null
): Promise<void> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const emissionDate = `${day}/${month}/${year}`;
  const safeCode = worker.codigo ? worker.codigo.replace(/[^A-Za-z0-9_-]/g, '') : 'TRABAJADOR';
  const filename = `Ficha_Trabajador_${safeCode}_${day}-${month}-${year}.pdf`;

  const blob = await pdf(
    <WorkerFichaPDF worker={worker} catalogs={catalogs} emissionDate={emissionDate} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function WorkerDetailModal({ open, workerId, onClose }: WorkerDetailModalProps) {
  const [worker, setWorker] = useState<TrabajadorResponse | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogosTrabajadorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open || workerId === null) return;
    let active = true;
    setLoading(true);
    setError(null);
    setWorker(null);

    const catalogsRequest = coreService.getWorkerCatalogs().catch(() => null);
    Promise.all([coreService.getWorker(workerId), catalogsRequest])
      .then(([data, catalogsData]) => {
        if (!active) return;
        setWorker(data);
        setCatalogs(catalogsData);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar la ficha.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, workerId, retry]);

  const personal = worker?.informacionPersonal;
  const labor = worker?.informacionLaboral;
  const documentType = catalogs?.tiposDocumento.find(
    (item) => item.idTipoDocumento === personal?.idTipoDocumento
  );
  const documentVerification = verifiedLabel(personal?.documentoVerificado);
  const emailVerification = verifiedLabel(personal?.correoVerificado);

  const handleExportPdf = async () => {
    if (!worker || exporting) return;
    setExporting(true);
    try {
      await generateAndDownloadWorkerPdf(worker, catalogs);
      toast.success('Ficha del trabajador exportada en PDF.');
    } catch {
      toast.error('No se pudo generar el archivo PDF de la ficha.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ficha del trabajador"
      description="Consulta de información personal y laboral registrada."
      width="max-w-3xl"
      footer={
        <>
          <Gate permission="hr.view">
            <Button
              variant="primary"
              icon={DownloadIcon}
              onClick={handleExportPdf}
              disabled={exporting || loading || !worker}
            >
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </Gate>
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cerrar
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-sm text-brand-500">Cargando ficha del trabajador...</p>
      ) : error ? (
        <div className="space-y-3 py-3 text-center">
          <p className="text-sm text-rose-700">{error}</p>
          <Button size="sm" onClick={() => setRetry((value) => value + 1)}>Reintentar</Button>
        </div>
      ) : worker && personal && labor ? (
        <div className="space-y-6">
          <section>
            <h3 className="mb-3 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
              Documento de identidad
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Tipo de documento" value={documentType?.nombre} />
              <DetailField label="Número de documento" value={personal.numeroDocumento} />
              {documentVerification ? <DetailField label="Verificación documental" value={documentVerification} /> : null}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
              Información personal
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField
                label="Nombres y apellidos"
                value={[personal.nombres, personal.apellidoPaterno, personal.apellidoMaterno].filter(Boolean).join(' ')}
              />
              <DetailField label="Fecha de nacimiento" value={formatWorkerDate(personal.fechaNacimiento)} />
              <DetailField label="Correo electrónico" value={personal.correoElectronico} />
              {emailVerification ? <DetailField label="Verificación del correo" value={emailVerification} /> : null}
              <DetailField label="Teléfono" value={personal.telefono} />
              <DetailField label="Dirección" value={personal.direccion} />
              <DetailField label="Referencia" value={personal.referencia} />
              <DetailField
                label="Departamento, provincia y distrito"
                value={[personal.departamento, personal.provincia, personal.distrito].filter(Boolean).join(', ')}
              />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 border-b border-brand-100 pb-2 text-sm font-semibold text-brand-900">
              Información laboral
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="Código laboral" value={worker.codigo} />
              <DetailField label="Área" value={labor.area} />
              <DetailField label="Cargo" value={labor.cargo} />
              <DetailField label="Tipo de vínculo laboral" value={labor.tipoVinculoLaboral} />
              <DetailField label="Horario" value={labor.horario} />
              <DetailField label="Fecha de creación" value={formatWorkerDate(worker.fechaCreacion)} />
              <DetailField label="Fecha de ingreso" value={formatWorkerDate(labor.fechaIngreso)} />
              <DetailField label="Fecha de cese" value={formatWorkerDate(labor.fechaCese)} />
              <DetailField label="Estado actual" value={labor.estadoTrabajador} />
              <DetailField label="Observaciones" value={labor.observaciones} />
            </dl>
          </section>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-brand-500">No hay información de ficha disponible.</p>
      )}
    </Modal>
  );
}
