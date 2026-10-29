import { useEffect, useState, type FormEvent } from 'react';
import { FileText, Search } from 'lucide-react';
import {
    crmBackend,
    type CrmPendingContractsPage
} from '../../services/crmBackend';
import { ContratoPdfUploader } from './ContratoPdfUploader';
import { toast } from 'sonner';
import { Gate } from '../auth/PermissionRoute';
import { AprobarFirmaContratoModal } from '../crm/AprobarFirmaContratoModal';

const TAMANO_PAGINA = 10;

const formatoMoneda = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
});

export function ContratosPendientesPanel() {
    const [busqueda, setBusqueda] = useState('');
    const [consulta, setConsulta] = useState('');
    const [pagina, setPagina] = useState(1);
    const [revision, setRevision] = useState(0);

    const [datos, setDatos] =
        useState<CrmPendingContractsPage | null>(null);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;

        setCargando(true);
        setError(null);

        crmBackend
            .listarContratosPendientes(
                consulta,
                pagina,
                TAMANO_PAGINA
            )
            .then((respuesta) => {
                if (activo) {
                    setDatos(respuesta);
                }
            })
            .catch((err: unknown) => {
                if (!activo) return;

                setDatos(null);
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible consultar los contratos.'
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [consulta, pagina, revision]);

    const buscar = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPagina(1);
        setConsulta(busqueda.trim());
    };

    const totalPaginas = Math.max(
        1,
        Math.ceil((datos?.total ?? 0) / TAMANO_PAGINA)
    );

    const revisarPdf = async (
        idContrato: number,
        idContratoArchivo: number
    ) => {
        setDocumentoRevisado(null);
        const ventana = window.open('about:blank', '_blank');

        if (!ventana) {
            toast.error(
                'El navegador bloqueó la ventana. Permite las ventanas emergentes.'
            );
            return;
        }

        ventana.opener = null;

        try {
            const resultado = await crmBackend.prepararLecturaContrato(
                idContrato,
                idContratoArchivo
            );

            const url = new URL(resultado.urlLectura);

            // Comprobar que el enlace sea de Storage privado.
            if (
                url.protocol !== 'https:' ||
                !url.hostname.endsWith('.supabase.co') ||
                !url.pathname.startsWith(
                    '/storage/v1/object/sign/contratos-firmados-private/'
                )
            ) {
                throw new Error('El enlace de lectura no es válido.');
            }

            ventana.location.replace(url.href);
            setDocumentoRevisado(`${idContrato}:${idContratoArchivo}`);

        } catch (error) {
            ventana.close();

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'No fue posible abrir el contrato.'
            );
        }
    };

    const [documentoRevisado, setDocumentoRevisado] = useState<string | null>(null);

    const [contratoEnAprobacion, setContratoEnAprobacion] = useState<{
        idContrato: number;
        idContratoArchivo: number;
        codigoContrato: string;
    } | null>(null);



    return (
        <section className="mb-6 rounded-xl border border-brand-100 bg-white p-5">

            <div className="mb-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-brand-900">
                    <FileText className="h-5 w-5" />
                    Contratos pendientes de firma
                </h2>

                <p className="mt-1 text-xs text-brand-500">
                    Operaciones reales registradas desde el nuevo
                    flujo CRM. Los PDF cargados quedan pendientes
                    de verificación.
                </p>
            </div>

            <form
                onSubmit={buscar}
                className="mb-5 flex flex-wrap gap-2"
            >
                <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar contrato, venta, comprador o lote"
                    maxLength={120}
                    className="min-w-0 flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm"
                />

                <button
                    type="submit"
                    className="flex items-center gap-2 rounded-lg bg-brand-900 px-4 py-2 text-sm font-medium text-white"
                >
                    <Search className="h-4 w-4" />
                    Buscar
                </button>
            </form>

            {cargando ? (
                <p className="py-6 text-center text-sm text-brand-500">
                    Consultando contratos pendientes...
                </p>
            ) : error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                    <button
                        type="button"
                        onClick={() => setRevision((v) => v + 1)}
                        className="mt-2 text-sm font-medium text-red-800 underline"
                    >
                        Reintentar
                    </button>
                </div>
            ) : !datos?.items.length ? (
                <div className="rounded-lg border border-brand-100 bg-brand-50 p-6 text-center">
                    <FileText className="mx-auto mb-2 h-8 w-8 text-brand-400" />

                    <p className="text-sm font-medium text-brand-800">
                        No hay contratos pendientes de firma
                    </p>

                    <p className="mt-1 text-xs text-brand-500">
                        Los contratos aparecerán aquí cuando
                        se registre una venta pendiente desde CRM.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {datos.items.map((contrato) => (
                        <div
                            key={contrato.idContrato}
                            className="rounded-xl border border-brand-100 p-4"
                        >
                            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-brand-900">
                                        {contrato.codigoContrato}
                                    </h3>

                                    <p className="text-xs text-brand-500">
                                        Venta: {contrato.codigoVenta}
                                    </p>

                                    <p className="mt-2 text-sm font-medium text-brand-800">
                                        {contrato.comprador}
                                    </p>

                                    <p className="text-xs text-brand-600">
                                        {contrato.nombreProyecto}
                                        {' · '}
                                        {contrato.codigoLote}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-sm font-semibold text-brand-900">
                                        {formatoMoneda.format(contrato.montoVenta)}
                                    </p>

                                    <span className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                        Pendiente de firma
                                    </span>
                                </div>
                            </div>

                            {contrato.tieneEvidencia && (
                                <div className="mb-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                                    PDF registrado:
                                    {' '}
                                    {contrato.nombreArchivoVigente}
                                    . Pendiente de validación.
                                </div>
                            )}

                            <ContratoPdfUploader
                                idContrato={contrato.idContrato}
                                codigoContrato={contrato.codigoContrato}
                                onUploaded={() => {
                                    setDocumentoRevisado(null);
                                    setRevision((v) => v + 1);
                                }}
                            />


                            <Gate permission="sales.approve">
                                {contrato.tieneEvidencia &&
                                    contrato.idArchivoVigente != null && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void revisarPdf(
                                                    contrato.idContrato,
                                                    contrato.idArchivoVigente!
                                                )
                                            }
                                            className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                        >
                                            Revisar PDF
                                        </button>
                                    )}
                            </Gate>


                            <Gate permission="sales.approve">
                                {contrato.tieneEvidencia &&
                                    contrato.idArchivoVigente != null && (
                                        <button
                                            type="button"
                                            disabled={
                                                documentoRevisado !==
                                                `${contrato.idContrato}:${contrato.idArchivoVigente}`
                                            }
                                            onClick={() =>
                                                setContratoEnAprobacion({
                                                    idContrato: contrato.idContrato,
                                                    idContratoArchivo: contrato.idArchivoVigente!,
                                                    codigoContrato: contrato.codigoContrato
                                                })
                                            }
                                            className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Aprobar firma
                                        </button>
                                    )}
                            </Gate>

                        </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-brand-100 pt-4">
                        <p className="text-xs text-brand-500">
                            {datos.total} contrato(s) · Página {pagina} de {totalPaginas}
                        </p>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={pagina <= 1}
                                onClick={() => setPagina((p) => p - 1)}
                                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs disabled:opacity-40"
                            >
                                Anterior
                            </button>

                            <button
                                type="button"
                                disabled={pagina >= totalPaginas}
                                onClick={() => setPagina((p) => p + 1)}
                                className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs disabled:opacity-40"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {contratoEnAprobacion && (
                <AprobarFirmaContratoModal
                    idContrato={contratoEnAprobacion.idContrato}
                    idContratoArchivo={contratoEnAprobacion.idContratoArchivo}
                    codigoContrato={contratoEnAprobacion.codigoContrato}
                    revisadoEnSesion={
                        documentoRevisado ===
                        `${contratoEnAprobacion.idContrato}:${contratoEnAprobacion.idContratoArchivo}`
                    }
                    onClose={() => setContratoEnAprobacion(null)}
                    onAprobado={() => {
                        setDocumentoRevisado(null);
                        setContratoEnAprobacion(null);
                        window.location.reload();
                    }}
                />
            )}
        </section>


    );
}
