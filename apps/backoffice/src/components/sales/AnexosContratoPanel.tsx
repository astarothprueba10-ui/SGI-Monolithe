import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  History,
  RefreshCw,
  Upload,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Gate } from '../auth/PermissionRoute';
import {
  crmBackend,
  type CrmAnexoContrato,
  type CrmAnexosContratoResponse,
  type CrmTipoAnexoContrato
} from '../../services/crmBackend';

type Props = {
  idContrato: number;
  codigoContrato: string;
  soloConsulta?: boolean;
  onUpdated?: () => void;
};

const TIPOS: ReadonlyArray<{
  codigo: CrmTipoAnexoContrato;
  titulo: string;
  descripcion: string;
}> = [
    {
      codigo: 'PLANO_LOTE',
      titulo: 'Plano individual del lote',
      descripcion: 'Plano correspondiente al lote asociado a este contrato.'
    },
    {
      codigo: 'MEMORIA_DESCRIPTIVA',
      titulo: 'Memoria descriptiva',
      descripcion: 'Documento técnico descriptivo del inmueble.'
    }
  ];

function fechaLocal(fecha?: string | null): string {
  if (!fecha) return 'No disponible';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima'
  }).format(valor);
}

function tamanoArchivo(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Tamaño no disponible';
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function AnexosContratoPanel({
  idContrato,
  codigoContrato,
  onUpdated,
  soloConsulta = false
}: Props) {
  const [datos, setDatos] = useState<CrmAnexosContratoResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [subiendo, setSubiendo] = useState<CrmTipoAnexoContrato | null>(null);
  const [abriendo, setAbriendo] = useState<number | null>(null);
  const [archivos, setArchivos] = useState<Record<CrmTipoAnexoContrato, File | null>>({
    PLANO_LOTE: null,
    MEMORIA_DESCRIPTIVA: null
  });
  const [estadoPdfAprobado, setEstadoPdfAprobado] = useState<
    'verificando' | 'disponible' | 'oculto'
  >('oculto');

  const [procesandoPdfContrato, setProcesandoPdfContrato] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState<Record<CrmTipoAnexoContrato, boolean>>({
    PLANO_LOTE: false,
    MEMORIA_DESCRIPTIVA: false
  });

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError(null);
    crmBackend.listarAnexosContrato(idContrato)
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.idContrato !== idContrato || !Array.isArray(respuesta.documentos)) {
          throw new Error('Los anexos recibidos no corresponden al contrato.');
        }
        setDatos(respuesta);
      })
      .catch((err: unknown) => {
        if (!activo) return;
        setDatos(null);
        setError(err instanceof Error ? err.message : 'No fue posible consultar los anexos.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [idContrato, revision]);

  useEffect(() => {
    if (
      !soloConsulta ||
      cargando ||
      datos?.idContrato !== idContrato ||
      datos?.estadoContrato !== 'VIGENTE'
    ) {
      setEstadoPdfAprobado('oculto');
      return;
    }

    let activo = true;
    setEstadoPdfAprobado('verificando');

    void crmBackend.prepararLecturaContratoAprobado(idContrato)
      .then(() => {
        if (activo) setEstadoPdfAprobado('disponible');
      })
      .catch(() => {
        if (activo) setEstadoPdfAprobado('oculto');
      });

    return () => {
      activo = false;
    };
  }, [
    soloConsulta,
    cargando,
    idContrato,
    datos?.idContrato,
    datos?.estadoContrato
  ]);

  const subir = async (tipo: CrmTipoAnexoContrato) => {
    const archivo = archivos[tipo];
    if (!archivo || subiendo !== null) return;

    setSubiendo(tipo);
    try {
      const resultado = await crmBackend.subirAnexoContrato(idContrato, tipo, archivo);
      if (!resultado.success || resultado.idContrato !== idContrato) {
        throw new Error('No fue posible confirmar el registro documental.');
      }
      toast.success(`${tipo === 'PLANO_LOTE' ? 'Plano' : 'Memoria'} registrado, versión ${resultado.numeroVersion}.`);
      setArchivos((actual) => ({ ...actual, [tipo]: null }));
      setRevision((actual) => actual + 1);
      onUpdated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No fue posible registrar el anexo.');
    } finally {
      setSubiendo(null);
    }
  };

  const abrirDocumento = async (anexo: CrmAnexoContrato) => {
    // Se abre la ventana en el gesto del usuario para evitar el bloqueo de pop-ups.
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      toast.error('Tu navegador bloqueó la pestaña. Permite las ventanas emergentes.');
      return;
    }
    ventana.opener = null;
    setAbriendo(anexo.idAnexo);
    try {
      const enlace = await crmBackend.prepararLecturaAnexoContrato(idContrato, anexo.idAnexo);
      if (enlace.tipoAnexo !== anexo.tipoAnexo || ventana.closed) {
        throw new Error('La respuesta de lectura es inconsistente o la pestaña fue cerrada.');
      }
      // El método del servicio valida que la URL pertenezca al Storage privado.
      ventana.location.replace(enlace.urlLectura);
    } catch (err: unknown) {
      if (!ventana.closed) ventana.close();
      toast.error(err instanceof Error ? err.message : 'No fue posible abrir el PDF.');
    } finally {
      setAbriendo(null);
    }
  };

  const descargarDocumento = async (anexo: CrmAnexoContrato) => {
    if (abriendo !== null) return;

    setAbriendo(anexo.idAnexo);

    try {
      const enlace = await crmBackend.prepararLecturaAnexoContrato(
        idContrato,
        anexo.idAnexo
      );

      if (
        enlace.idContrato !== idContrato ||
        enlace.idAnexo !== anexo.idAnexo
      ) {
        throw new Error('El documento no corresponde al contrato.');
      }

      const respuesta = await fetch(enlace.urlLectura, {
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo descargar el documento.');
      }

      const archivo = await respuesta.blob();

      if (archivo.size === 0 || archivo.size > 10 * 1024 * 1024) {
        throw new Error('El archivo PDF no tiene un tamaño válido.');
      }

      const urlTemporal = URL.createObjectURL(archivo);
      const enlaceDescarga = document.createElement('a');

      enlaceDescarga.href = urlTemporal;
      enlaceDescarga.download = anexo.nombreArchivoOriginal;
      document.body.appendChild(enlaceDescarga);
      enlaceDescarga.click();
      enlaceDescarga.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
      }, 30000);

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No fue posible descargar el PDF.'
      );
    } finally {
      setAbriendo(null);
    }
  };
  const consultarPdfAprobado = async (
    accion: 'visualizar' | 'descargar'
  ) => {
    if (
      procesandoPdfContrato ||
      estadoPdfAprobado !== 'disponible'
    ) return;

    const ventana =
      accion === 'visualizar'
        ? window.open('about:blank', '_blank')
        : null;

    if (accion === 'visualizar' && !ventana) {
      toast.error('El navegador bloqueó la ventana emergente.');
      return;
    }

    if (ventana) ventana.opener = null;

    setProcesandoPdfContrato(true);

    try {
      const enlace =
        await crmBackend.prepararLecturaContratoAprobado(idContrato);

      if (accion === 'visualizar') {
        if (!ventana || ventana.closed) return;
        ventana.location.replace(enlace.urlLectura);
        return;
      }

      const respuesta = await fetch(enlace.urlLectura, {
        cache: 'no-store'
      });

      if (!respuesta.ok) {
        throw new Error('No fue posible descargar el contrato.');
      }

      const archivo = await respuesta.blob();

      if (!archivo.size || archivo.size > 10485760) {
        throw new Error('El archivo PDF no tiene un tamaño válido.');
      }

      const urlTemporal = URL.createObjectURL(archivo);
      const enlaceDescarga = document.createElement('a');

      enlaceDescarga.href = urlTemporal;
      enlaceDescarga.download =
        enlace.nombreOriginal.split(/[\\/]/).pop() ||
        `contrato-${idContrato}.pdf`;

      document.body.appendChild(enlaceDescarga);
      enlaceDescarga.click();
      enlaceDescarga.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
      }, 30000);

    } catch (error) {
      if (ventana && !ventana.closed) ventana.close();

      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo consultar el contrato.'
      );
    } finally {
      setProcesandoPdfContrato(false);
    }
  };

  if (soloConsulta) {
    const tipos = [
      { codigo: 'PLANO_LOTE', titulo: 'Plano individual del lote' },
      { codigo: 'MEMORIA_DESCRIPTIVA', titulo: 'Memoria descriptiva' }
    ] as const;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-brand-900">
          Documentación asociada a la venta
        </h3>

        {cargando && <p>Consultando documentos...</p>}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!cargando && !error && (
          <>
            {estadoPdfAprobado === 'verificando' && (
              <p className="text-xs text-brand-500">
                Verificando contrato firmado...
              </p>
            )}

            {estadoPdfAprobado === 'disponible' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-emerald-600" />

                  <div>
                    <p className="text-sm font-medium text-brand-900">
                      Contrato firmado
                    </p>
                    <p className="text-xs text-emerald-700">
                      Firma aprobada · PDF disponible
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={procesandoPdfContrato}
                    onClick={() => void consultarPdfAprobado('visualizar')}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-800 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </button>

                  <button
                    type="button"
                    disabled={procesandoPdfContrato}
                    onClick={() => void consultarPdfAprobado('descargar')}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-800 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </button>
                </div>
              </div>
            )}

            {tipos.map(({ codigo, titulo }) => {
              const documento = datos?.documentos
                .filter((d) => d.tipoAnexo === codigo && d.vigente)
                .sort((a, b) => b.numeroVersion - a.numeroVersion)[0];

              return (
                <div
                  key={codigo}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-brand-600" />
                    <div>
                      <p className="text-sm font-medium">{titulo}</p>
                      <p className="text-xs text-brand-500">
                        {documento ? 'Disponible' : 'Pendiente de registro'}
                      </p>
                    </div>
                  </div>

                  {documento && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={abriendo !== null}
                        onClick={() => void abrirDocumento(documento)}
                        className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-800 disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </button>

                      <button
                        type="button"
                        disabled={abriendo !== null}
                        onClick={() => void descargarDocumento(documento)}
                        className="inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-2 text-xs font-medium text-brand-800 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Descargar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900">
            <FileText className="h-4 w-4" /> Anexos contractuales
          </h4>
          <p className="mt-1 text-xs text-brand-600">Contrato {codigoContrato}. Solo documentos PDF de hasta 10 MB.</p>
          <p className="mt-1 text-xs text-brand-500">Registrar un anexo no lo aprueba ni lo publica al cliente.</p>
        </div>
        <button type="button" onClick={() => setRevision((actual) => actual + 1)}
          disabled={cargando || subiendo !== null}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-800 disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {cargando ? (
        <p role="status" className="py-5 text-center text-sm text-brand-600">Consultando anexos...</p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</p>
          <button type="button" onClick={() => setRevision((actual) => actual + 1)} className="mt-2 text-xs underline">Reintentar</button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {TIPOS.map(({ codigo, titulo, descripcion }) => {
            const documentos = (datos?.documentos ?? [])
              .filter((anexo) => anexo.tipoAnexo === codigo)
              .sort((a, b) => b.numeroVersion - a.numeroVersion);
            const vigente = documentos.find((anexo) => anexo.vigente);
            const historicos = documentos.filter((anexo) => !anexo.vigente);
            return (
              <section key={codigo} className="rounded-xl border border-brand-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-semibold text-brand-900">{titulo}</h5>
                    <p className="mt-1 text-xs text-brand-500">{descripcion}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${vigente ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {vigente ? 'Registrado' : 'Pendiente'}
                  </span>
                </div>

                {vigente ? (
                  <div className="mt-3 rounded-lg border border-brand-100 p-3 text-xs text-brand-700">
                    <p className="break-all font-medium text-brand-900">{vigente.nombreArchivoOriginal}</p>
                    <p className="mt-1">Versión {vigente.numeroVersion} · {tamanoArchivo(vigente.tamanoBytes)}</p>
                    <p className="mt-1">Cargado: {fechaLocal(vigente.fechaCarga)}</p>
                    <p className={`mt-1 flex items-center gap-1 ${vigente.visibleCliente ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {vigente.visibleCliente ? 'Visible al cliente' : 'No publicado al cliente'}
                    </p>
                    <button type="button" onClick={() => void abrirDocumento(vigente)}
                      disabled={abriendo !== null}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-brand-200 px-3 py-1.5 font-medium text-brand-800 disabled:opacity-50">
                      <Eye className="h-4 w-4" /> {abriendo === vigente.idAnexo ? 'Preparando...' : 'Visualizar PDF'}
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Este contrato todavía no tiene {titulo.toLowerCase()} vigente.</p>
                )}

                <Gate permission="sales.edit">
                  <div className="mt-4 border-t border-brand-100 pt-3">
                    <label htmlFor={`anexo-${idContrato}-${codigo}`} className="block text-xs font-semibold text-brand-800">
                      {vigente ? 'Subir nueva versión' : 'Registrar documento'}
                    </label>
                    <input id={`anexo-${idContrato}-${codigo}`} type="file" accept=".pdf,application/pdf"
                      disabled={subiendo !== null}
                      className="mt-2 block w-full rounded-lg border border-brand-200 bg-white p-2 text-xs text-brand-700 disabled:opacity-50"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setArchivos((actual) => ({ ...actual, [codigo]: file }));
                        event.currentTarget.value = '';
                      }} />
                    {archivos[codigo] && <p className="mt-2 break-all text-xs text-brand-600">Seleccionado: {archivos[codigo]?.name}</p>}
                    <button type="button" onClick={() => void subir(codigo)}
                      disabled={!archivos[codigo] || subiendo !== null}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                      <Upload className="h-4 w-4" /> {subiendo === codigo ? 'Registrando PDF...' : (vigente ? 'Reemplazar versión' : 'Subir PDF')}
                    </button>
                  </div>
                </Gate>

                {historicos.length > 0 && (
                  <div className="mt-4 border-t border-brand-100 pt-3">
                    <button type="button"
                      className="inline-flex items-center gap-2 text-xs font-medium text-brand-800 underline"
                      aria-expanded={historialAbierto[codigo]}
                      onClick={() => setHistorialAbierto((actual) => ({ ...actual, [codigo]: !actual[codigo] }))}>
                      <History className="h-4 w-4" /> Historial de versiones ({historicos.length})
                    </button>
                    {historialAbierto[codigo] && (
                      <ul className="mt-2 space-y-2">
                        {historicos.map((anexo) => (
                          <li key={anexo.idAnexo} className="rounded-lg border border-brand-100 p-2 text-xs text-brand-700">
                            <p className="break-all font-medium">v{anexo.numeroVersion}: {anexo.nombreArchivoOriginal}</p>
                            <p className="mt-1">{fechaLocal(anexo.fechaCarga)}</p>
                            <button type="button" onClick={() => void abrirDocumento(anexo)}
                              disabled={abriendo !== null}
                              className="mt-1 inline-flex items-center gap-1 font-medium text-brand-800 underline disabled:opacity-50">
                              <Eye className="h-3.5 w-3.5" /> Ver versión anterior
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
