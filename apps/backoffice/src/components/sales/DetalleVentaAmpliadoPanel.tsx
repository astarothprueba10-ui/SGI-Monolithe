import { useEffect, useState, type ReactNode } from 'react';
import {
  CreditCardIcon, FileImageIcon, FileTextIcon, ExternalLinkIcon,
  LoaderCircleIcon, MapPinIcon, UsersIcon, WalletIcon,
  BadgeCheckIcon, RefreshCwIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  crmBackend,
  type CrmDetalleVenta,
  type CrmComprobanteVentaLectura
} from '../../services/crmBackend';
import { currency } from '../../utils/format';

const presente = (valor: string | number | null | undefined): string =>
  valor == null || String(valor).trim() === '' ? 'No registrado' : String(valor);

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-brand-100 py-2.5">
      <dt className="mb-1 text-[11px] font-medium text-brand-500">{etiqueta}</dt>
      <dd className="break-words text-[13px] font-semibold text-brand-900">{children}</dd>
    </div>
  );
}

function Seccion({ titulo, icono, children }: {
  titulo: string; icono: ReactNode; children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-brand-100 bg-white p-3 sm:p-5">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-900">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-700">{icono}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function ComprobanteVentaSoloLectura({ idVenta, comprobante }: {
  idVenta: number; comprobante: CrmComprobanteVentaLectura
}) {
  const [miniatura, setMiniatura] = useState<string | null>(null);
  const [errorMiniatura, setErrorMiniatura] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const esImagen = ['image/png','image/jpeg','image/webp'].includes(comprobante.tipoMime);

  useEffect(() => {
    let vigente = true;
    setMiniatura(null);
    setErrorMiniatura(false);
    if (esImagen) {
      void crmBackend.obtenerComprobanteVenta(idVenta, comprobante.idComprobante)
        .then(enlace => { if (vigente) setMiniatura(enlace.urlDescarga); })
        .catch(() => { if (vigente) setErrorMiniatura(true); });
    }
    return () => { vigente = false; };
  }, [idVenta, comprobante.idComprobante, esImagen]);

  const abrir = async () => {
    if (abriendo) return;
    // La ventana se abre en el clic para no ser bloqueada por el navegador.
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      toast.error('Permite las ventanas emergentes para visualizar el comprobante.');
      return;
    }
    ventana.opener = null;
    setAbriendo(true);
    try {
      const enlace = await crmBackend.obtenerComprobanteVenta(idVenta, comprobante.idComprobante);
      ventana.location.replace(enlace.urlDescarga);
    } catch (error: unknown) {
      ventana.close();
      toast.error('No se pudo visualizar el comprobante', {
        description: error instanceof Error ? error.message : 'Revisa el acceso al archivo.'
      });
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <button type="button" onClick={() => void abrir()} disabled={abriendo}
      aria-label={`Visualizar comprobante ${comprobante.nombreArchivo}`}
      className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/30 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60">
      <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-brand-100 bg-white sm:h-24 sm:w-28">
        {esImagen && miniatura && !errorMiniatura ? (
          <img className="h-full w-full object-contain" src={miniatura}
            alt={`Vista previa de ${comprobante.nombreArchivo}`} loading="lazy"
            onError={() => setErrorMiniatura(true)} />
        ) : comprobante.tipoMime === 'application/pdf' ? (
          <FileTextIcon className="h-9 w-9 text-rose-700" />
        ) : (
          <FileImageIcon className="h-9 w-9 text-brand-400" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block break-all text-xs font-semibold text-brand-900 sm:text-sm">
          {comprobante.nombreArchivo}
        </span>
        <span className="block text-[11px] text-brand-500">
          {comprobante.tipoMime === 'application/pdf' ? 'PDF' : 'Imagen'}
          {' · '}{(comprobante.tamanioBytes / 1024).toFixed(0)} KB
        </span>
        <span className="block text-[11px] text-brand-600">
          Revisión: {presente(comprobante.estadoRevision)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:underline">
          {abriendo ? 'Abriendo…' : 'Visualizar original'}
          {abriendo ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
            : <ExternalLinkIcon className="h-3.5 w-3.5" />}
        </span>
      </span>
    </button>
  );
}

const ESTADO_CIVIL: Record<string, string> = {
  SOLTERO: 'Soltero(a)', CASADO: 'Casado(a)',
  DIVORCIADO: 'Divorciado(a)', VIUDO: 'Viudo(a)'
};

export function DetalleVentaAmpliadoPanel({ idVenta }: { idVenta: number }) {
  const [detalle, setDetalle] = useState<CrmDetalleVenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setDetalle(null);
    setError(null);
    setCargando(true);
    void crmBackend.obtenerDetalleVenta(idVenta)
      .then(datos => { if (vigente) setDetalle(datos); })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof Error ? e.message : 'No fue posible obtener el expediente.');
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [idVenta, intento]);

  if (cargando) return (
    <div className="flex items-center gap-2 rounded-xl border border-brand-100 p-4 text-sm text-brand-500">
      <LoaderCircleIcon className="h-4 w-4 animate-spin" />
      Consultando información contractual y comprobantes…
    </div>
  );
  if (error || !detalle) return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
      <p>No se pudo consultar la información ampliada de la venta. {error}</p>
      <button className="mt-2 inline-flex items-center gap-1 font-semibold underline"
        type="button" onClick={() => setIntento(x => x + 1)}>
        <RefreshCwIcon className="h-3.5 w-3.5" /> Reintentar
      </button>
    </div>
  );

  const comprador = detalle.comprador;
  const conyuge = detalle.conyuge;
  const dom = detalle.domicilio;
  const pago = detalle.pago;
  const plan = detalle.financiamiento;
  const localidad = [dom.distrito, dom.provincia, dom.departamento, dom.pais]
    .filter((x): x is string => Boolean(x?.trim())).join(' · ');

  return (
    <div className="space-y-4">
      {!detalle.tieneExpediente && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Venta histórica: algunos datos corresponden al registro actual del comprador.
          La información no almacenada en su expediente original se indica como «No registrado».
        </p>
      )}

      <Seccion titulo="Identificación del comprador" icono={<BadgeCheckIcon className="h-4 w-4" />}>
        <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Campo etiqueta="Comprador">{presente(comprador.nombreCompleto)}</Campo>
          <Campo etiqueta={comprador.tipoDocumento || 'Documento de identidad'}>
            <span className="font-mono">{presente(comprador.numeroDocumento)}</span>
          </Campo>
          <Campo etiqueta="Estado civil">
            {comprador.estadoCivil
              ? (ESTADO_CIVIL[comprador.estadoCivil] ?? comprador.estadoCivil)
              : 'No registrado'}
          </Campo>
          <Campo etiqueta="Teléfono / WhatsApp">{presente(comprador.telefono)}</Campo>
          <Campo etiqueta="Correo electrónico">{presente(comprador.correo)}</Campo>
        </dl>
      </Seccion>

      {comprador.estadoCivil === 'CASADO' && (
        <Seccion titulo="Datos contractuales del cónyuge" icono={<UsersIcon className="h-4 w-4" />}>
          {conyuge ? (
            <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
              <Campo etiqueta="Nombre completo">
                {presente([conyuge.nombres, conyuge.apellidoPaterno, conyuge.apellidoMaterno]
                  .filter(Boolean).join(' '))}
              </Campo>
              <Campo etiqueta={conyuge.tipoDocumento || 'Documento del cónyuge'}>
                <span className="font-mono">{presente(conyuge.numeroDocumento)}</span>
              </Campo>
              <Campo etiqueta="Teléfono">{presente(conyuge.telefono)}</Campo>
              <Campo etiqueta="Correo electrónico">{presente(conyuge.correo)}</Campo>
            </dl>
          ) : (
            <p className="text-xs text-brand-500">Los datos del cónyuge no están registrados en esta venta.</p>
          )}
          <p className="mt-3 text-[11px] text-brand-500">
            Datos informativos para el contrato. No acreditan por sí solos copropiedad ni firma.
          </p>
        </Seccion>
      )}

      <Seccion titulo="Domicilio del comprador" icono={<MapPinIcon className="h-4 w-4" />}>
        <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Campo etiqueta="Dirección">{presente(dom.direccion)}</Campo>
          <Campo etiqueta="Referencia del domicilio">{presente(dom.referencia)}</Campo>
          <div className="sm:col-span-2">
            <Campo etiqueta="Distrito · Provincia · Departamento · País">
              {localidad || 'No registrado'}
            </Campo>
          </div>
        </dl>
      </Seccion>

      <Seccion titulo="Pago de la venta" icono={<WalletIcon className="h-4 w-4" />}>
        <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
          <Campo etiqueta="Método de pago">{presente(pago.metodo)}</Campo>
          <Campo etiqueta="N.º de operación">{presente(pago.numeroOperacion)}</Campo>
          <Campo etiqueta={pago.tipoAbono === 'INICIAL'
            ? 'Inicial declarada para revisión' : 'Monto declarado para revisión'}>
            {pago.montoPorRevisar == null ? 'No registrado' : currency(pago.montoPorRevisar)}
          </Campo>
          <Campo etiqueta="Estado de revisión financiera">
            {presente(pago.estadoRevision)}
          </Campo>
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-brand-500">
          Registrar un comprobante no significa que Finanzas haya confirmado el pago.
        </p>
      </Seccion>

      {detalle.modalidad === 'FINANCIADA' && (
        <Seccion titulo="Plan de financiamiento" icono={<CreditCardIcon className="h-4 w-4" />}>
          {plan ? (
            <>
              <dl className="grid grid-cols-1 gap-x-5 sm:grid-cols-2">
                <Campo etiqueta="Inicial adicional">{currency(plan.montoInicial)}</Campo>
                <Campo etiqueta="Reserva acreditada">{currency(plan.abonoReserva ?? 0)}</Campo>
                <Campo etiqueta="Plazo de financiamiento">
                  {plan.numeroCuotas} {plan.numeroCuotas === 1 ? 'mes' : 'meses'}
                </Campo>
                <Campo etiqueta="Capital restante financiado">
                  {currency(plan.capitalFinanciado)}
                </Campo>
                <Campo etiqueta="Intereses totales">{currency(plan.interesesTotales)}</Campo>
                <Campo etiqueta="Total del plan en cuotas">{currency(plan.totalPendienteEnCuotas)}</Campo>
                <Campo etiqueta="Cuotas pendientes por cancelar">
                  {currency(plan.saldoCuotasPendiente)}
                </Campo>
                <Campo etiqueta="Sistema de amortización">
                  {plan.sistema === 'FRANCES' ? 'Francés'
                    : plan.sistema === 'ALEMAN' ? 'Alemán' : 'No especificado'}
                  {plan.tasaAnualNominal != null && (
                    <span className="ml-1 text-xs font-normal text-brand-600">
                      · {plan.tasaAnualNominal}% nominal anual
                    </span>
                  )}
                </Campo>
              </dl>
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3 sm:p-4">
                <p className="text-xs font-semibold text-sky-900">
                  {plan.cuotaFija ? 'Cuota mensual fija' : 'Primera cuota mensual registrada'}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-brand-900">
                  {plan.cuotaMensual == null ? 'No registrada' : currency(plan.cuotaMensual)}
                </p>
                <p className="mt-2 text-[11px] text-brand-600">
                  {plan.cuotaFija
                    ? 'En el sistema francés las cuotas son constantes, salvo ajustes finales de redondeo.'
                    : 'El importe corresponde al cronograma histórico; no se presupone una cuota fija.'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-brand-500">
              No existe un plan financiero detallado asociado a esta venta.
            </p>
          )}
        </Seccion>
      )}

      <Seccion titulo="Comprobantes de pago" icono={<FileTextIcon className="h-4 w-4" />}>
        {pago.comprobantes.length > 0 ? (
          <>
            <p className="mb-3 text-xs text-brand-600">
              {pago.comprobantes.length} archivo(s) adjunto(s).
              Selecciona un comprobante para visualizarlo en su formato original.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {pago.comprobantes.map(c => (
                <ComprobanteVentaSoloLectura
                  key={c.idComprobante} idVenta={idVenta} comprobante={c} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-brand-500">
            Esta venta no tiene comprobantes digitalizados asociados.
          </p>
        )}
        <p className="mt-3 text-[11px] text-brand-500">
          Acceso de solo lectura mediante enlaces temporales. No hay acciones de reemplazo o eliminación.
        </p>
      </Seccion>
    </div>
  );
}
