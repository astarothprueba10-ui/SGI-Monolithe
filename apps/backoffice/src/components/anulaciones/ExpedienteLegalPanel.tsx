import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FileText, RefreshCw, UploadCloud, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Field';
import { anulacionesBackend, type EvidenciaLegal, type TipoDocumentoLegal } from '../../services/anulacionesBackend';

const TITULOS: Record<TipoDocumentoLegal, string> = {
  INFORME_LEGAL: 'Informe legal',
  ACUERDO_RESOLUCION: 'Acuerdo de resolución',
  CARTA_NOTARIAL: 'Carta notarial',
  OTRO_SUSTENTO: 'Otro sustento'
};

export function ExpedienteLegalPanel({
  idSolicitud, puedeCargar, seleccion, onSeleccionar
}: {
  idSolicitud: number;
  puedeCargar: boolean;
  seleccion?: number | null;
  onSeleccionar?: (id: number | null) => void;
}) {
  const [items, setItems] = useState<EvidenciaLegal[]>([]);
  const [revision, setRevision] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoDocumentoLegal>('INFORME_LEGAL');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [abriendo, setAbriendo] = useState<number | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    anulacionesBackend.evidencias(idSolicitud)
      .then((r) => {
        if (vigente) {
          if (r.idSolicitud !== idSolicitud || !Array.isArray(r.items)) {
            throw new Error('Respuesta de expediente inconsistente.');
          }
          setItems(r.items);
        }
      })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : 'Error consultando documentos.');
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idSolicitud, revision]);

  const subir = async () => {
    if (!archivo || subiendo) return;
    setSubiendo(true);
    try {
      await anulacionesBackend.subirEvidencia(idSolicitud, tipo, archivo);
      setArchivo(null);
      toast.success('PDF incorporado al expediente. Pendiente de evaluación jurídica.');
      setRevision((r) => r + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el PDF.');
    } finally {
      setSubiendo(false);
    }
  };

  const abrir = async (item: EvidenciaLegal) => {
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      toast.error('El navegador bloqueó la pestaña del documento.');
      return;
    }
    ventana.opener = null;
    setAbriendo(item.idEvidencia);
    try {
      const enlace = await anulacionesBackend.prepararLectura(idSolicitud, item.idEvidencia);
      if (!ventana.closed) ventana.location.replace(enlace.urlLectura);
    } catch (err) {
      if (!ventana.closed) ventana.close();
      toast.error(err instanceof Error ? err.message : 'No se pudo abrir el archivo privado.');
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
          <FileText className="h-4 w-4" /> Documentación jurídica · Solicitud #{idSolicitud}
        </h3>
        <Button size="sm" icon={RefreshCw} disabled={cargando} onClick={() => setRevision((r) => r + 1)}>Actualizar</Button>
      </div>
      <p className="mb-4 text-xs text-brand-600">
        Los PDF son privados. Una carga no equivale a una aprobación jurídica ni comercial.
      </p>
      {cargando ? <p role="status" className="text-sm text-brand-500">Cargando evidencias…</p> :
        error ? <p role="alert" className="text-sm text-rose-700">{error}</p> :
          items.length === 0 ? <p className="text-sm text-brand-600">Todavía no hay evidencias legales registradas.</p> :
            <ul className="space-y-2">
              {items.map((item) => {
                const sirveParaConforme = item.archivoDisponible &&
                  (item.tipoDocumento === 'INFORME_LEGAL' || item.tipoDocumento === 'ACUERDO_RESOLUCION');
                return <li key={item.idEvidencia} className="rounded-md border border-brand-100 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-brand-900">{item.nombreOriginal}</p>
                      <p className="mt-1 text-xs text-brand-500">
                        {TITULOS[item.tipoDocumento]} · {(item.tamanoBytes / 1024 / 1024).toFixed(2)} MB
                        {' · '}{item.archivoDisponible ? 'Archivo disponible' : 'No disponible / modificado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {onSeleccionar && sirveParaConforme && <label className="flex items-center gap-1 text-xs">
                        <input type="radio" name={`dictamen-pdf-${idSolicitud}`}
                          checked={seleccion === item.idEvidencia}
                          onChange={() => onSeleccionar(item.idEvidencia)} />
                        Usar en dictamen
                      </label>}
                      <Button size="sm" icon={ExternalLink}
                        disabled={!item.archivoDisponible || abriendo !== null}
                        onClick={() => void abrir(item)}>
                        {abriendo === item.idEvidencia ? 'Abriendo…' : 'Ver PDF'}
                      </Button>
                    </div>
                  </div>
                </li>;
              })}
            </ul>}
      {puedeCargar && <div className="mt-4 space-y-3 border-t border-brand-100 pt-4">
        <p className="text-sm font-semibold text-brand-800">Añadir PDF (solo Gerencia)</p>
        <Select aria-label="Tipo de documento legal" value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoDocumentoLegal)} disabled={subiendo}>
          {Object.entries(TITULOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <input type="file" accept=".pdf,application/pdf" aria-label="Archivo PDF legal"
          disabled={subiendo} className="block w-full text-xs" onChange={(e) => {
            setArchivo(e.target.files?.[0] ?? null);
            e.currentTarget.value = '';
          }} />
        {archivo && <p className="break-all text-xs text-brand-500">Seleccionado: {archivo.name}</p>}
        <Button icon={UploadCloud} variant="primary" disabled={!archivo || subiendo}
          onClick={() => void subir()}>{subiendo ? 'Registrando…' : 'Subir y registrar evidencia'}</Button>
      </div>}
    </Card>
  );
}
