package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.FormalizarVentaCrmRequest;
import monolithe.core_service.dto.CancelarVentaPendienteRequest;
import monolithe.core_service.dto.RegistrarEvidenciaContratoRequest;
import monolithe.core_service.dto.ConfirmarFirmaContratoRequest;
import monolithe.core_service.dto.RegistrarSeparacionCrmRequest;
import monolithe.core_service.dto.RevisarVoucherSeparacionRequest;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class CrmVentaService {

    private final JdbcTemplate jdbc;
    private final JsonMapper jsonMapper;

    /**
     * Historial de operaciones del lote. Los estados son actuales, no eventos de
     * cambio.
     */

    /** Historial comercial del lote, consultado mediante función almacenada. */
    @Transactional(readOnly = true)
    public JsonNode historialComercialLote(Long actor, Long idLote) {

        validarActor(actor);

        if (idLote == null || idLote <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de lote invalido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_historial_comercial_lote_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idLote);
    }

    @Transactional(readOnly = true)
    public JsonNode validar(
            Long actor,
            FormalizarVentaCrmRequest req) {

        validarActor(actor);

        if (req == null
                || req.idProspecto() == null
                || req.idLote() == null
                || req.modalidad() == null
                || req.montoTotal() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos obligatorios de venta incompletos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_validar_formalizacion_v10(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS numeric),
                    CAST(? AS numeric),
                    CAST(? AS integer),
                    CAST(? AS numeric)
                )::text
                """,
                actor,
                req.idProspecto(),
                req.idLote(),
                req.modalidad(),
                req.montoTotal(),
                req.montoInicial(),
                req.numeroCuotas(),
                req.tasaInteresMensualPct());
    }

    @Transactional(readOnly = true)
    public JsonNode listarLotesReservadosDelProspecto(
            Long actor, Long idProspecto) {

        validarActor(actor);

        if (idProspecto == null || idProspecto <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de prospecto invalido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_lotes_reservados_prospecto_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idProspecto);
    }

    /** Expediente contractual editable, delimitado por cartera y permiso sales.create en BD. */
    @Transactional(readOnly = true)
    public JsonNode datosCompradorParaVenta(Long actor, Long idProspecto) {
        validarActor(actor);
        if (idProspecto == null || idProspecto <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Prospecto invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_datos_comprador_para_venta_v3(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idProspecto);
    }

    /** Obtiene las reservas vigentes del prospecto con proyecto, etapa y abono acreditado. */
    @Transactional(readOnly = true)
    public JsonNode listarReservasVigentesParaVenta(Long actor, Long idProspecto) {
        validarActor(actor);
        if (idProspecto == null || idProspecto <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador del prospecto invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_reservas_vigentes_para_venta_v2(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor, idProspecto);
    }

    @Transactional(readOnly = true)
    public JsonNode verificarComprador(
            Long actor,
            Long idProspecto) {

        validarActor(actor);

        if (idProspecto == null || idProspecto <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de prospecto invalido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_verificar_conversion_comprador_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idProspecto);
    }

    @Transactional
    public JsonNode registrarVentaPendiente(
            Long actor,
            FormalizarVentaCrmRequest req) {

        validarActor(actor);

        if (req == null
                || req.idProspecto() == null
                || req.idLote() == null
                || req.modalidad() == null
                || req.montoTotal() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos obligatorios de venta incompletos.");
        }

        if (req.datosComprador() == null || !req.datosComprador().isObject()
                || req.datosComprador().toString().length() > 15000
                || req.datosComprador().path("idProspecto").asLong() != req.idProspecto()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Revise la ficha contractual del comprador antes de registrar.");
        }
        if (!req.datosComprador().path("identidadVerificada").isBoolean()
                || !req.datosComprador().path("identidadVerificada").asBoolean()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El asesor debe confirmar la verificacion del documento del comprador.");
        }
        if (req.datosPago() == null || !req.datosPago().isObject()
                || req.datosPago().toString().length() > 16000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Indique metodo de pago y comprobantes de la venta.");
        }
        return ejecutar("""
                SELECT public.sp_crm_registrar_venta_pendiente_v14(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS numeric),
                    CAST(? AS numeric),
                    CAST(? AS integer),
                    CAST(? AS numeric),
                    CAST(? AS text),
                    CAST(? AS jsonb),
                    CAST(? AS jsonb)
                )::text
                """,
                actor,
                req.idProspecto(),
                req.idLote(),
                req.modalidad(),
                req.montoTotal(),
                req.montoInicial(),
                req.numeroCuotas(),
                req.tasaInteresMensualPct(),
                req.observaciones(),
                req.datosComprador().toString(),
                req.datosPago().toString());
    }

    @Transactional(readOnly = true)
    public void validarSeparacionPreviaCarga(
            Long actor, Long idProspecto, Long idLote) {

        validarActor(actor);

        if (idProspecto == null || idProspecto <= 0
                || idLote == null || idLote <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Prospecto y lote son obligatorios.");
        }

        JsonNode resultado = ejecutar("""
                SELECT public.sp_crm_validar_preparacion_comprobante_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor, idProspecto, idLote);

        if (!resultado.path("autorizado").asBoolean(false)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No autorizado para preparar el comprobante.");
        }
    }

    @Transactional
    public JsonNode registrarSeparacion(
            Long actor,
            RegistrarSeparacionCrmRequest request) {
        validarActor(actor);
        validarDatosSeparacion(request);
        return ejecutar("""
                SELECT public.sp_crm_registrar_separacion_v2(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS numeric),
                    CAST(? AS text),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS bigint),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                request.idProspecto(),
                request.idLote(),
                request.metodoPago(),
                request.numeroOperacion(),
                request.monto(),
                request.observaciones(),
                request.claveArchivo(),
                request.nombreArchivo(),
                request.tipoMime(),
                request.tamanioBytes(),
                request.hashSha256());
    }

    private void validarDatosSeparacion(RegistrarSeparacionCrmRequest req) {
        if (req == null || req.idProspecto() == null || req.idProspecto() <= 0
                || req.idLote() == null || req.idLote() <= 0
                || req.monto() == null || req.monto().compareTo(new java.math.BigDecimal("500.00")) != 0
                || req.metodoPago() == null || req.metodoPago().isBlank()
                || req.claveArchivo() == null || req.claveArchivo().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos de separacion invalidos.");
        }
    }

    @Transactional
    public JsonNode conciliarPagoSeparacion(
            Long actor,
            Long idPago,
            Long idCuentaFinanciera,
            Long idCategoria) {

        validarActor(actor);

        if (idPago == null || idPago <= 0
                || idCuentaFinanciera == null || idCuentaFinanciera <= 0
                || idCategoria == null || idCategoria <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Pago, cuenta financiera y categoría son obligatorios.");
        }

        return ejecutar("""
                SELECT public.sp_finanzas_conciliar_pago_confirmado_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idPago,
                idCuentaFinanciera,
                idCategoria);
    }

    @Transactional(readOnly = true)
    public JsonNode listarConciliacionesSeparacion(
            Long actor,
            String estado,
            String busqueda,
            Integer pagina,
            Integer tamano) {

        validarActor(actor);

        return ejecutar("""
                SELECT public.sp_finanzas_listar_conciliaciones_separacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor,
                estado,
                busqueda,
                pagina,
                tamano);
    }

    @Transactional(readOnly = true)
    public JsonNode listarVouchersSeparacion(
            Long actor, String estado, String busqueda, Integer pagina, Integer tamano) {
        validarActor(actor);
        return ejecutar("""
                SELECT public.sp_finanzas_listar_vouchers_separacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor, estado, busqueda, pagina, tamano);
    }

    /** Inicial adicional de contrato ya firmado: no incluye reserva S/500. */
    @Transactional(readOnly = true)
    public JsonNode opcionesRegistroVoucherInicial(Long actor,String busqueda,Integer limite) {
        validarActor(actor);
        int cantidad=limite==null?60:limite;
        if(cantidad<1||cantidad>100||(busqueda!=null&&busqueda.length()>120))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de iniciales inválidos.");
        return ejecutar("""
            SELECT public.sp_fin_opciones_registro_inicial_v1(
              CAST(? AS bigint),CAST(? AS varchar),CAST(? AS integer)
            )::text
            """,actor,busqueda,cantidad);
    }

    /** Reserva carga documental del abono a inicial; todavía no crea un pago. */
    @Transactional
    public JsonNode prepararCargaVoucherInicial(Long actor,
            monolithe.core_service.dto.PrepararCargaVoucherInicialRequest req) {
        validarActor(actor);
        if(req==null||req.idVenta()==null||req.idVenta()<=0
          ||req.idPlanPago()==null||req.idPlanPago()<=0
          ||req.monto()==null||req.monto().signum()<=0||req.monto().scale()>2
          ||req.idMetodoPago()==null||req.idMetodoPago()<=0
          ||req.fechaOperacion()==null
          ||req.nombreArchivo()==null||req.nombreArchivo().isBlank()
          ||req.nombreArchivo().length()>180||req.tipoMime()==null
          ||req.tamanioBytes()==null||req.tamanioBytes()<1
          ||req.tamanioBytes()>5242880L
          ||(req.numeroOperacion()!=null&&req.numeroOperacion().length()>100))
          throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos del comprobante de inicial inválidos.");
        return ejecutar("""
            SELECT public.sp_fin_preparar_carga_voucher_inicial_v1(
              CAST(? AS bigint),CAST(? AS bigint),CAST(? AS bigint),
              CAST(? AS numeric),CAST(? AS integer),CAST(? AS date),
              CAST(? AS varchar),CAST(? AS varchar),CAST(? AS varchar),
              CAST(? AS bigint)
            )::text
            """,actor,req.idVenta(),req.idPlanPago(),req.monto(),
             req.idMetodoPago(),req.fechaOperacion(),req.numeroOperacion(),
             req.nombreArchivo(),req.tipoMime(),req.tamanioBytes());
    }

    /** Finaliza carga privada de inicial sin aplicar ni confirmar dinero. */
    @Transactional
    public JsonNode registrarVoucherInicialPendiente(Long actor,java.util.UUID idCarga) {
        validarActor(actor);
        if(idCarga==null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Referencia de carga inválida.");
        return ejecutar("""
            SELECT public.sp_fin_registrar_voucher_inicial_pendiente_v1(
              CAST(? AS bigint),CAST(? AS uuid)
            )::text
            """,actor,idCarga);
    }

    /** Cuotas disponibles y métodos de pago para registrar un comprobante. */
    @Transactional(readOnly = true)
    public JsonNode opcionesRegistroVoucherCuota(Long actor, String busqueda, Integer limite) {
        validarActor(actor);
        int cantidad=limite==null?60:limite;
        if(cantidad<1||cantidad>100||(busqueda!=null&&busqueda.length()>120))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de cuotas inválidos.");
        return ejecutar("""
            SELECT public.sp_fin_opciones_registro_cuota_v1(
                CAST(? AS bigint),CAST(? AS varchar),CAST(? AS integer)
            )::text
            """,actor,busqueda,cantidad);
    }

    /** La preautorización no inserta pagos ni aplicaciones contables. */
    @Transactional
    public JsonNode prepararCargaVoucherCuota(
            Long actor,monolithe.core_service.dto.PrepararCargaVoucherCuotaRequest req) {
        validarActor(actor);
        if(req==null||req.idVenta()==null||req.idVenta()<=0
                ||req.idCuota()==null||req.idCuota()<=0
                ||req.monto()==null||req.monto().signum()<=0
                ||req.monto().scale()>2
                ||req.idMetodoPago()==null||req.idMetodoPago()<=0
                ||req.fechaOperacion()==null
                ||req.nombreArchivo()==null||req.nombreArchivo().isBlank()
                ||req.nombreArchivo().length()>180
                ||req.tipoMime()==null
                ||req.tamanioBytes()==null||req.tamanioBytes()<1
                ||req.tamanioBytes()>5242880L
                ||(req.numeroOperacion()!=null&&req.numeroOperacion().length()>100)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos del comprobante de cuota inválidos.");
        }
        return ejecutar("""
          SELECT public.sp_fin_preparar_carga_voucher_cuota_v1(
            CAST(? AS bigint),CAST(? AS bigint),CAST(? AS bigint),
            CAST(? AS numeric),CAST(? AS integer),CAST(? AS date),
            CAST(? AS varchar),CAST(? AS varchar),
            CAST(? AS varchar),CAST(? AS bigint)
          )::text
          """,actor,req.idVenta(),req.idCuota(),req.monto(),
            req.idMetodoPago(),req.fechaOperacion(),req.numeroOperacion(),
            req.nombreArchivo(),req.tipoMime(),req.tamanioBytes());
    }

    /** Finalización idempotente: solo REGISTRADO/PENDIENTE, sin imputar cuota. */
    @Transactional
    public JsonNode registrarVoucherCuotaPendiente(Long actor,java.util.UUID idCarga) {
        validarActor(actor);
        if(idCarga==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Identificador de carga inválido.");
        return ejecutar("""
          SELECT public.sp_fin_registrar_voucher_cuota_pendiente_v1(
            CAST(? AS bigint),CAST(? AS uuid)
          )::text
          """,actor,idCarga);
    }

    /** Cierre 5.3.5: conciliación informativa, sin escrituras en el libro mayor. */
    @Transactional(readOnly = true)
    public JsonNode conciliacionFinanciera(Long actor,String estado,String busqueda,
            Integer pagina,Integer tamano) {
        validarActor(actor);
        String filtro=estado==null?"TODOS":estado;
        String buscar=busqueda==null?"":busqueda.trim();
        int pag=pagina==null?1:pagina;
        int size=tamano==null?20:tamano;
        if(!java.util.Set.of("TODOS","CON_ALERTA","SIN_ALERTA").contains(filtro)
                ||buscar.length()>120||pag<1||pag>10000||size<1||size>100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de conciliación inválidos.");
        }
        return ejecutar("""
            SELECT public.sp_fin_conciliacion_integral_v1(
              CAST(? AS bigint),CAST(? AS varchar),CAST(? AS varchar),
              CAST(? AS integer),CAST(? AS integer)
            )::text
            """,actor,filtro,buscar,pag,size);
    }

    /** Anotaciones con registro de eventos, no corrige ni anula pagos. */
    @Transactional
    public JsonNode marcarRevisionConciliacion(Long actor,Long pago,
            monolithe.core_service.dto.MarcarConciliacionRequest req) {
        validarActor(actor);
        if(pago==null||pago<=0||req==null
                ||req.codigoIncidencia()==null||req.codigoIncidencia().length()>55
                ||req.estado()==null
                ||!java.util.Set.of("EN_REVISION","REVISADA").contains(req.estado())
                ||req.comentario()==null||req.comentario().trim().length()<10
                ||req.comentario().length()>500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Incidencia o comentario inválidos.");
        return ejecutar("""
            SELECT public.sp_fin_marcar_revision_conciliacion_v1(
              CAST(? AS bigint),CAST(? AS bigint),CAST(? AS varchar),
              CAST(? AS varchar),CAST(? AS varchar)
            )::text
            """,actor,pago,req.codigoIncidencia(),req.estado(),
                    req.comentario().trim());
    }

    /** Finanzas: pagos confirmados disponibles y historial auditable. */
    @Transactional(readOnly = true)
    public JsonNode listarImputacionesFinancieras(Long actor, Integer pagina, Integer tamano) {
        validarActor(actor);
        int page=pagina==null?1:pagina;
        int size=tamano==null?20:tamano;
        if(page<1||page>10000||size<1||size>100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginación de aplicaciones financieras inválida.");
        }
        return ejecutar("""
          SELECT public.sp_fin_imputaciones_v1(
            CAST(? AS bigint),CAST(? AS integer),CAST(? AS integer)
          )::text
          """,actor,page,size);
    }

    /** Aplicación contable de pago ya CONFIRMADO, sin modificar cronogramas. */
    @Transactional
    public JsonNode aplicarPagoConfirmado(Long actor,
            monolithe.core_service.dto.AplicarPagoConfirmadoRequest req) {
        validarActor(actor);
        if(req==null||req.idSolicitud()==null
                ||req.idPago()==null||req.idPago()<=0
                ||req.tipo()==null||!java.util.Set.of("CUOTA","INICIAL").contains(req.tipo())
                ||req.monto()==null||req.monto().signum()<=0
                ||req.monto().scale()>2
                ||(req.tipo().equals("CUOTA")&&(req.idCuota()==null||req.idCuota()<=0))
                ||(req.tipo().equals("INICIAL")&&req.idCuota()!=null)
                ||(req.observaciones()!=null&&req.observaciones().length()>255)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pago o destino de imputación inválidos.");
        }
        return ejecutar("""
          SELECT public.sp_fin_aplicar_pago_confirmado_v1(
            CAST(? AS bigint),CAST(? AS uuid),CAST(? AS bigint),
            CAST(? AS varchar),CAST(? AS bigint),CAST(? AS numeric),
            CAST(? AS varchar)
          )::text
          """,actor,req.idSolicitud(),req.idPago(),req.tipo(),
             req.idCuota(),req.monto(),req.observaciones());
    }

    /** Reversión de aplicación propia del 5.3.4, por una segunda persona. */
    @Transactional
    public JsonNode revertirAplicacionPago(Long actor, Long idAplicacion,
            monolithe.core_service.dto.RevertirAplicacionPagoRequest req) {
        validarActor(actor);
        if(idAplicacion==null||idAplicacion<=0||req==null
            ||req.motivo()==null||req.motivo().trim().length()<5
            ||req.motivo().length()>255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El identificador y motivo de reversión son obligatorios.");
        }
        return ejecutar("""
          SELECT public.sp_fin_revertir_aplicacion_v1(
            CAST(? AS bigint),CAST(? AS bigint),CAST(? AS varchar)
          )::text
          """,actor,idAplicacion,req.motivo().trim());
    }

    /** Revisión segregada de voucher de cuota. Aprobación confirma el pago
     * pero NO aplica abonos ni cambia pag_cuotas. Rechazo exige motivo.
     */
    @Transactional
    public JsonNode revisarVoucherCuota(Long actor, Long idVoucher,
            monolithe.core_service.dto.RevisarVoucherCuotaRequest req) {
        validarActor(actor);
        if(idVoucher==null||idVoucher<=0||req==null||req.aprobar()==null
                ||(req.observaciones()!=null&&req.observaciones().length()>500)
                ||(req.motivo()!=null&&req.motivo().length()>255)
                ||(!req.aprobar()&&(req.motivo()==null
                   ||req.motivo().trim().length()<5))
                ||(req.aprobar()&&req.motivo()!=null&&!req.motivo().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La decisión o motivo de rechazo no es válido.");
        }
        return ejecutar("""
            SELECT public.sp_finanzas_revisar_voucher_financiamiento_v2(
              CAST(? AS bigint),CAST(? AS bigint),CAST(? AS boolean),
              CAST(? AS varchar),CAST(? AS varchar)
            )::text
            """,actor,idVoucher,req.aprobar(),req.motivo(),req.observaciones());
    }

    /** Bandeja de comprobantes de cuotas: datos reales y archivos verificados. */
    @Transactional(readOnly = true)
    public JsonNode listarVouchersCuotas(Long actor, String estado,
            String busqueda, Integer pagina, Integer tamano) {
        validarActor(actor);
        String filtro = (estado == null || estado.isBlank()) ? "TODOS" : estado;
        int page = pagina == null ? 1 : pagina;
        int size = tamano == null ? 20 : tamano;
        if (!java.util.Set.of("TODOS", "PENDIENTE", "APROBADO", "RECHAZADO").contains(filtro)
                || page < 1 || page > 10000 || size < 1 || size > 100
                || (busqueda != null && busqueda.length() > 120)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de comprobantes inválidos.");
        }
        return ejecutar("""
                SELECT public.sp_finanzas_listar_vouchers_financiamiento_v2(
                  CAST(? AS bigint), CAST(? AS varchar),CAST(? AS varchar),
                  CAST(? AS integer),CAST(? AS integer)
                )::text
                """, actor, filtro, busqueda, page, size);
    }

    /** Ruta para un comprobante de CUOTAS, jamás de separaciones. */
    @Transactional(readOnly = true)
    public JsonNode obtenerRutaVoucherCuota(Long actor, Long idVoucher) {
        validarActor(actor);
        if (idVoucher == null || idVoucher <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de comprobante inválido.");
        }
        return ejecutar("""
                SELECT public.sp_finanzas_obtener_ruta_voucher_cuota_v1(
                  CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idVoucher);
    }

    /** Ruta validada de un comprobante, segun el alcance comercial de la reserva. */
    @Transactional(readOnly = true)
    public JsonNode obtenerRutaComprobanteSeparacion(Long actor, Long idReserva) {
        validarActor(actor);
        if (idReserva == null || idReserva <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de separacion invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_obtener_comprobante_separacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor, idReserva);
    }

    @Transactional
    public JsonNode revisarVoucherSeparacion(
            Long actor, Long idVoucher, RevisarVoucherSeparacionRequest request) {
        validarActor(actor);
        validarRevisionVoucher(idVoucher, request);
        return ejecutar("""
                SELECT public.sp_finanzas_revisar_voucher_separacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS boolean),
                    CAST(? AS text),
                    CAST(? AS text)
                )::text
                """,
                actor, idVoucher, request.aprobar(), request.motivo(), request.observaciones());
    }

    private void validarRevisionVoucher(Long idVoucher, RevisarVoucherSeparacionRequest req) {
        if (idVoucher == null || idVoucher <= 0 || req == null || req.aprobar() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parametros de revision invalidos.");
        }
        if (Boolean.FALSE.equals(req.aprobar()) && (req.motivo() == null || req.motivo().trim().length() < 5)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Motivo de rechazo obligatorio (minimo 5 caracteres).");
        }
    }

    @Transactional(readOnly = true)
    public JsonNode obtenerRutaVoucher(Long actor, Long idVoucher) {
        validarActor(actor);
        if (idVoucher == null || idVoucher <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de voucher invalido.");
        }
        return ejecutar("""
                SELECT public.sp_finanzas_obtener_ruta_voucher_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor, idVoucher);
    }

    @Transactional
    public JsonNode cancelarVentaPendiente(
            Long actor,
            Long idVenta,
            CancelarVentaPendienteRequest request) {

        validarActor(actor);

        if (idVenta == null || idVenta <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de venta inválido.");
        }

        if (request == null
                || request.motivo() == null
                || request.motivo().trim().length() < 10
                || request.motivo().trim().length() > 250) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El motivo debe tener entre 10 y 250 caracteres.");
        }

        return ejecutar("""
                SELECT public.sp_crm_cancelar_venta_pendiente_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idVenta,
                request.motivo().trim());
    }

    /** Ficha personal y cambios auditados; la BD valida crm.view y cartera. */
    @Transactional(readOnly = true)
    public JsonNode datosPersonalesCrm(Long actor, Long idProspecto) {
        validarActor(actor);
        if (idProspecto==null || idProspecto<=0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Prospecto inválido.");
        return ejecutar("""
            SELECT public.sp_crm_datos_personales_edicion_v1(
                CAST(? AS bigint),CAST(? AS bigint)
            )::text
            """,actor,idProspecto);
    }

    /** Corrección personal: jamás sustituye los datos sin auditoría de identidad. */
    @Transactional
    public JsonNode corregirDatosPersonalesCrm(Long actor, Long idProspecto,
            JsonNode datos, String motivo) {
        validarActor(actor);
        if (idProspecto==null || idProspecto<=0 || datos==null || !datos.isObject()
                || datos.toString().length()>5000 || motivo==null
                || motivo.trim().length()<8 || motivo.trim().length()>500)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos personales o motivo de corrección inválidos.");
        return ejecutar("""
            SELECT public.sp_crm_corregir_datos_personales_v1(
                CAST(? AS bigint),CAST(? AS bigint),
                CAST(? AS jsonb),CAST(? AS text)
            )::text
            """,actor,idProspecto,datos.toString(),motivo.trim());
    }

    /** Buscar CRM sin fecha global; filtros, proyecto y alcance siguen comprobados en PostgreSQL. */
    @Transactional(readOnly = true)
    public JsonNode buscarCarteraSinPeriodo(Long actor, String busqueda, String etapa,
            String origen, Long idAsesor, Boolean sinAsignar,
            String categoria, Integer pagina, Integer tamano, Long idProyecto) {
        validarActor(actor);
        int numero=pagina==null?1:pagina, cantidad=tamano==null?15:tamano;
        if (numero<1 || numero>100000 || cantidad<1 || cantidad>100
                || (idProyecto!=null && idProyecto<=0)
                || (idAsesor!=null && idAsesor<=0)
                || (busqueda!=null && busqueda.length()>120))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de CRM o paginación inválidos.");
        return ejecutar("""
                SELECT public.sp_crm_buscar_v7(
                  CAST(? AS bigint),CAST(? AS varchar),CAST(? AS varchar),
                  CAST(? AS varchar),CAST(? AS bigint),CAST(? AS boolean),
                  CAST(? AS varchar),CAST(? AS integer),CAST(? AS integer),
                  CAST(? AS bigint),CAST(NULL AS timestamptz),CAST(NULL AS timestamptz)
                )::text
                """,actor,busqueda,etapa,origen,idAsesor,sinAsignar,
                categoria==null?"TODOS":categoria,numero,cantidad,idProyecto);
    }

    /** Listado unificado paginado, con alcance comercial por actor. */
    @Transactional(readOnly = true)
    public JsonNode listarOperaciones(
            Long actor, String tipo, String busqueda, Integer pagina, Integer tamano) {
        validarActor(actor);

        String filtroTipo = tipo == null ? ""
                : tipo.trim()
                        .toUpperCase(java.util.Locale.ROOT).replace('Ó', 'O');
        if (!filtroTipo.isEmpty() && !filtroTipo.equals("VENTA")
                && !filtroTipo.equals("SEPARACION")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El tipo de operación debe ser VENTA o SEPARACION.");
        }

        String filtroBusqueda = busqueda == null ? ""
                : busqueda.trim()
                        .toLowerCase(java.util.Locale.ROOT);
        if (filtroBusqueda.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La búsqueda no puede superar los 120 caracteres.");
        }

        int paginaActual = pagina == null ? 1 : pagina;
        int tamanoActual = tamano == null ? 20 : tamano;
        if (paginaActual < 1 || paginaActual > 100000
                || tamanoActual < 1 || tamanoActual > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginación inválida. Tamaño permitido: 1 a 100.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_operaciones_v1(
                    CAST(? AS bigint),
                    CAST(? AS text),
                    CAST(? AS text),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor, filtroTipo, filtroBusqueda,
                paginaActual, tamanoActual);
    }

    /** Expediente de venta de solo lectura, con autorización por venta en PostgreSQL. */
    @Transactional(readOnly = true)
    public JsonNode detalleVenta(Long actor, Long idVenta) {
        validarActor(actor);
        if (idVenta == null || idVenta <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de venta invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_detalle_venta_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idVenta);
    }

    /** Saldo financiero por venta, basado en aplicaciones CUOTA confirmadas.
     * No confunde inicial, reserva, pagos pendientes ni vouchers no conciliados.
     */
    @Transactional(readOnly = true)
    public JsonNode saldoVenta(Long actor, Long idVenta) {
        validarActor(actor);
        if (idVenta == null || idVenta <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de venta invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_saldo_venta_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idVenta);
    }

    /** Agregado del saldo de un cliente titular, limitado a la cartera del JWT. */
    @Transactional(readOnly = true)
    public JsonNode saldoCliente(Long actor, Long idCliente) {
        validarActor(actor);
        if (idCliente == null || idCliente <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de cliente invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_saldo_cliente_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idCliente);
    }

    /** Cronograma financiero: cuotas reales o proyección expresamente identificada. */
    @Transactional(readOnly = true)
    public JsonNode cronogramaVenta(Long actor, Long idVenta) {
        validarActor(actor);
        if (idVenta==null || idVenta<=0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Venta inválida.");
        return ejecutar("""
            SELECT public.sp_crm_cronograma_venta_v4(
              CAST(? AS bigint),CAST(? AS bigint)
            )::text
            """,actor,idVenta);
    }

    /** Cartera financiera real: planes y cuotas con el motor de saldos del Portal Cliente. */
    @Transactional(readOnly = true)
    public JsonNode carteraFinancieraReal(Long actor, String vista, String busqueda,
            Integer pagina, Integer tamano) {
        validarActor(actor);
        String modo = vista == null ? "PLANES" : vista.trim().toUpperCase(java.util.Locale.ROOT);
        String texto = busqueda == null ? "" : busqueda.trim();
        int page = pagina == null ? 1 : pagina;
        int size = tamano == null ? 20 : tamano;
        if (!java.util.Set.of("PLANES","CUOTAS").contains(modo)
                || texto.length()>120 || page<1 || page>100000
                || size<1 || size>100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Filtros de cartera inválidos.");
        }
        return ejecutar("""
            SELECT public.sp_fin_cartera_backoffice_v1(
              CAST(? AS bigint),CAST(? AS text),CAST(? AS text),
              CAST(? AS integer),CAST(? AS integer)
            )::text
            """,actor,modo,texto,page,size);
    }

    /** Pagos y comprobantes efectivamente registrados; nunca datos de demostración. */
    @Transactional(readOnly = true)
    public JsonNode movimientosFinancierosReales(Long actor, String busqueda,
            Integer pagina, Integer tamano) {
        validarActor(actor);
        String texto = busqueda == null ? "" : busqueda.trim();
        int page = pagina == null ? 1 : pagina;
        int size = tamano == null ? 20 : tamano;
        if (texto.length()>120 || page<1 || page>100000 || size<1 || size>100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Filtros de movimientos inválidos.");
        }
        return ejecutar("""
            SELECT public.sp_fin_movimientos_backoffice_v1(
              CAST(? AS bigint),CAST(? AS text),
              CAST(? AS integer),CAST(? AS integer)
            )::text
            """,actor,texto,page,size);
    }

    /** Alertas próximas y vencidas verificadas, limitadas a la cartera del JWT. */
    @Transactional(readOnly = true)
    public JsonNode alertasCuotas(Long actor, String tipo, Integer pagina, Integer tamano) {
        validarActor(actor);
        String filtro = tipo == null || tipo.isBlank() ? "TODAS" : tipo;
        int page = pagina == null ? 1 : pagina;
        int size = tamano == null ? 20 : tamano;
        if (!java.util.Set.of("TODAS", "CUOTA_PROXIMA", "CUOTA_VENCIDA").contains(filtro)
                || page < 1 || page > 10000 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filtros de alertas o paginacion invalidos.");
        }
        return ejecutar("""
            SELECT public.sp_fin_alertas_cuotas_v1(
              CAST(? AS bigint), CAST(? AS varchar),
              CAST(? AS integer), CAST(? AS integer)
            )::text
            """, actor, filtro, page, size);
    }

    /** Posible causal resolutoria: sólo consulta y revisión jurídica.
     * Tres cuotas numeradas consecutivamente, vencidas y con saldo confirmado.
     */
    @Transactional(readOnly = true)
    public JsonNode revisarTresCuotasConsecutivas(Long actor, Integer pagina, Integer tamano) {
        validarActor(actor);
        int page=pagina==null?1:pagina;
        int size=tamano==null?20:tamano;
        if(page<1||page>10000||size<1||size>100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginacion de revision contractual invalida.");
        }
        return ejecutar("""
            SELECT public.sp_fin_alertas_resolutoria_v1(
                CAST(? AS bigint),CAST(? AS integer),CAST(? AS integer)
            )::text
            """,actor,page,size);
    }

    /** Solo preparación de notificaciones internas PORTAL, nunca email/SMS.
     * Se invoca explícitamente con autoridad de aprobación financiera.
     */
    @Transactional
    public JsonNode prepararAvisosCuotasPortal(Long actor, Integer limite) {
        validarActor(actor);
        int cantidad = limite == null ? 100 : limite;
        if (cantidad < 1 || cantidad > 500) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Limite de avisos invalido.");
        }
        return ejecutar("""
            SELECT public.sp_fin_preparar_avisos_portal_v1(
              CAST(? AS bigint), CAST(? AS integer)
            )::text
            """, actor, cantidad);
    }

    /** Metadatos de Storage: nunca devuelve una ruta sin comprobar la venta y el archivo. */
    @Transactional(readOnly = true)
    public JsonNode rutaComprobanteVenta(Long actor, Long idVenta, Long idComprobante) {
        validarActor(actor);
        if (idVenta == null || idVenta <= 0 || idComprobante == null || idComprobante <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de comprobante invalido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_comprobante_venta_v1(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idVenta, idComprobante);
    }

    /** La BD vuelve a validar sales.export y limita los registros al actor. */
    @Transactional(readOnly = true)
    public JsonNode listarSeparacionesParaExportacion(
            Long actor, Integer pagina, Integer tamano) {
        validarActor(actor);
        int numero = pagina == null ? 1 : pagina;
        int cantidad = tamano == null ? 100 : tamano;
        if (numero < 1 || numero > 100000 || cantidad < 1 || cantidad > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginacion de exportacion invalida.");
        }
        return ejecutar("""
                SELECT public.sp_crm_exportar_separaciones_v1(
                    CAST(? AS bigint),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor, numero, cantidad);
    }

    /** Exportación de ventas: sales.view + sales.export y alcance de cartera en la BD. */
    @Transactional(readOnly = true)
    public JsonNode listarVentasParaExportacion(
            Long actor, Integer pagina, Integer tamano) {
        validarActor(actor);
        int numero = pagina == null ? 1 : pagina;
        int cantidad = tamano == null ? 100 : tamano;
        if (numero < 1 || numero > 100000 || cantidad < 1 || cantidad > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginación de exportación inválida.");
        }
        return ejecutar("""
                SELECT public.sp_crm_exportar_ventas_v1(
                    CAST(? AS bigint),CAST(? AS integer),CAST(? AS integer)
                )::text
                """, actor, numero, cantidad);
    }

    @Transactional
    public JsonNode registrarEvidenciaContrato(
            Long actor,
            Long idContrato,
            RegistrarEvidenciaContratoRequest request) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (request == null
                || request.claveArchivo() == null
                || request.claveArchivo().isBlank()
                || request.nombreOriginal() == null
                || request.nombreOriginal().isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos del documento son obligatorios.");
        }

        return ejecutar("""
                SELECT public.sp_crm_registrar_evidencia_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                request.claveArchivo().trim(),
                request.nombreOriginal().trim());
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarCargaContrato(
            Long actor,
            Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_carga_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato);
    }

    @Transactional
    public JsonNode registrarEvidenciaLegal(
            Long actor,
            Long idSolicitud,
            String tipoDocumento,
            String claveArchivo,
            String nombreOriginal,
            String hashSha256) {

        validarActor(actor);

        if (idSolicitud == null || idSolicitud <= 0
                || tipoDocumento == null
                || claveArchivo == null || claveArchivo.isBlank()
                || nombreOriginal == null || nombreOriginal.isBlank()
                || hashSha256 == null
                || !hashSha256.matches("(?i)[a-f0-9]{64}")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos de evidencia legal inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_registrar_evidencia_legal_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idSolicitud,
                tipoDocumento,
                claveArchivo,
                nombreOriginal,
                hashSha256.toLowerCase(java.util.Locale.ROOT));
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarCargaEvidenciaLegal(
            Long actor,
            Long idSolicitud) {

        validarActor(actor);

        if (idSolicitud == null || idSolicitud <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de solicitud inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_carga_evidencia_legal_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idSolicitud);
    }

    @Transactional
    public JsonNode registrarAnexoContrato(
            Long actor,
            Long idContrato,
            String tipoAnexo,
            String claveArchivo,
            String nombreOriginal,
            String hashSha256) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (!"PLANO_LOTE".equals(tipoAnexo)
                && !"MEMORIA_DESCRIPTIVA".equals(tipoAnexo)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tipo de anexo inválido.");
        }

        if (claveArchivo == null || claveArchivo.isBlank()
                || nombreOriginal == null || nombreOriginal.isBlank()
                || hashSha256 == null
                || !hashSha256.matches("(?i)[a-f0-9]{64}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Datos o huella SHA-256 del archivo inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_registrar_anexo_contrato_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                tipoAnexo,
                claveArchivo,
                nombreOriginal,
                hashSha256.toLowerCase(java.util.Locale.ROOT));
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarLecturaAnexoContrato(
            Long actor,
            Long idContrato,
            Long idAnexo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0
                || idAnexo == null || idAnexo <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificadores de contrato o anexo inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_anexo_contrato_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato,
                idAnexo);
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarCargaAnexoContrato(
            Long actor,
            Long idContrato,
            String tipoAnexo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (!"PLANO_LOTE".equals(tipoAnexo)
                && !"MEMORIA_DESCRIPTIVA".equals(tipoAnexo)) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Tipo de anexo contractual inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_carga_anexo_contrato_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                tipoAnexo);
    }

    @Transactional(readOnly = true)
    public JsonNode listarAnexosContrato(
            Long actor,
            Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_anexos_contrato_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato);
    }

    @Transactional(readOnly = true)
    public JsonNode listarContratosDocumentacion(
            Long actor,
            String busqueda,
            Integer pagina,
            Integer tamano) {

        validarActor(actor);

        int paginaSegura = pagina == null ? 1 : pagina;
        int tamanoSeguro = tamano == null ? 20 : tamano;

        if (paginaSegura < 1 || paginaSegura > 100000
                || tamanoSeguro < 1 || tamanoSeguro > 100
                || (busqueda != null && busqueda.length() > 120)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Parámetros de consulta inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_contratos_documentacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor,
                busqueda == null ? null : busqueda.trim(),
                paginaSegura,
                tamanoSeguro);
    }

    @Transactional(readOnly = true)
    public JsonNode listarContratosPendientes(
            Long actor,
            String busqueda,
            Integer pagina,
            Integer tamano) {

        validarActor(actor);

        int paginaSegura = pagina == null ? 1 : pagina;
        int tamanoSeguro = tamano == null ? 20 : tamano;

        if (paginaSegura < 1 || paginaSegura > 100000
                || tamanoSeguro < 1 || tamanoSeguro > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Parámetros de paginación inválidos.");
        }

        if (busqueda != null && busqueda.length() > 120) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El texto de búsqueda es demasiado largo.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_contratos_pendientes_v6(
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """,
                actor,
                busqueda == null ? null : busqueda.trim(),
                paginaSegura,
                tamanoSeguro);
    }

    @Transactional
    public JsonNode aprobarFirmaContrato(
            Long actor,
            Long idContrato,
            ConfirmarFirmaContratoRequest request) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato inválido.");
        }

        if (request == null
                || request.idContratoArchivo() == null
                || request.idContratoArchivo() <= 0
                || request.fechaFirma() == null
                || !request.firmaRevisada()
                || request.observaciones() == null
                || request.observaciones().trim().length() < 15
                || request.observaciones().trim().length() > 500) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos de aprobación son inválidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_aprobar_firma_contrato_v8(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS date),
                    CAST(? AS boolean),
                    CAST(? AS varchar)
                )::text
                """,
                actor,
                idContrato,
                request.idContratoArchivo(),
                request.fechaFirma(),
                request.firmaRevisada(),
                request.observaciones().trim());
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarLecturaPdfContrato(
            Long actor,
            Long idContrato,
            Long idContratoArchivo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0
                || idContratoArchivo == null
                || idContratoArchivo <= 0) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El contrato o documento seleccionado es inválido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_pdf_contrato_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato,
                idContratoArchivo);
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarLecturaPdfAprobado(
            Long actor,
            Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El identificador del contrato es invalido.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_pdf_aprobado_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato);
    }

    @Transactional(readOnly = true)
    public JsonNode listarEvidenciasLegales(
            Long actor, Long idSolicitud) {

        validarActor(actor);

        if (idSolicitud == null || idSolicitud <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Solicitud de anulación inválida.");
        }

        return ejecutar("""
                SELECT public.sp_crm_listar_evidencias_legales_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """, actor, idSolicitud);
    }

    @Transactional(readOnly = true)
    public JsonNode autorizarLecturaEvidenciaLegal(
            Long actor, Long idSolicitud, Long idEvidencia) {

        validarActor(actor);

        if (idSolicitud == null || idSolicitud <= 0
                || idEvidencia == null || idEvidencia <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Solicitud o evidencia legal inválida.");
        }

        return ejecutar("""
                SELECT public.sp_crm_autorizar_lectura_evidencia_legal_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """, actor, idSolicitud, idEvidencia);
    }

    @Transactional(readOnly = true)
    public JsonNode listarCasosRevisionLegal(
            Long actor, Integer pagina, Integer tamano) {

        validarActor(actor);

        return ejecutar("""
                SELECT public.sp_crm_listar_casos_revision_legal_v1(
                    CAST(? AS bigint),
                    CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """, actor, pagina, tamano);
    }

    @Transactional
    public JsonNode registrarRevisionLegal(
            Long actor, Long idSolicitud,
            Integer versionEsperada, String resultado,
            String sustento, Long idEvidencia) {

        validarActor(actor);

        return ejecutar("""
                SELECT public.sp_crm_registrar_revision_legal_anulacion_v1(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS integer),
                    CAST(? AS varchar),
                    CAST(? AS text),
                    CAST(? AS bigint)
                )::text
                """, actor, idSolicitud, versionEsperada,
                resultado, sustento, idEvidencia);
    }

    // ===== CRM: solicitudes y revisiones de anulaciones =====
    @Transactional
    public JsonNode solicitarAnulacion(
            Long actor, String tipoOperacion, Long idOperacion,
            String categoriaMotivo, String motivo) {

        validarActor(actor);
        if (idOperacion == null || idOperacion <= 0
                || tipoOperacion == null || categoriaMotivo == null
                || motivo == null || motivo.trim().length() < 20
                || motivo.trim().length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos inválidos para solicitar la anulación.");
        }
        return ejecutar("""
                SELECT public.sp_crm_solicitar_anulacion_v1(
                    CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS text)
                )::text
                """, actor, tipoOperacion.trim(), idOperacion,
                categoriaMotivo.trim(), motivo.trim());
    }

    @Transactional(readOnly = true)
    public JsonNode listarSolicitudesAnulacion(
            Long actor, String tipo, String estado, String busqueda,
            Integer pagina, Integer tamano) {

        validarActor(actor);
        validarPaginacionAnulaciones(pagina, tamano);
        if (busqueda != null && busqueda.length() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La búsqueda no puede superar los 120 caracteres.");
        }
        return ejecutar("""
                SELECT public.sp_crm_listar_solicitudes_anulacion_v1(
                    CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS varchar), CAST(? AS varchar),
                    CAST(? AS integer), CAST(? AS integer)
                )::text
                """, actor, tipo, estado, busqueda, pagina, tamano);
    }

    @Transactional(readOnly = true)
    public JsonNode listarHistorialAnulaciones(
            Long actor, String tipo, Long idOperacion,
            Integer pagina, Integer tamano) {

        validarActor(actor);
        validarPaginacionAnulaciones(pagina, tamano);
        if (idOperacion != null && idOperacion <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El identificador de operación es inválido.");
        }
        return ejecutar("""
                SELECT public.sp_crm_listar_historial_anulaciones_v1(
                    CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS bigint), CAST(? AS integer),
                    CAST(? AS integer)
                )::text
                """, actor, tipo, idOperacion, pagina, tamano);
    }

    @Transactional
    public JsonNode decidirSolicitudAnulacion(
            Long actor, Long idSolicitud, Integer versionEsperada,
            String accion, String justificacion) {

        validarActor(actor);
        if (idSolicitud == null || idSolicitud <= 0
                || versionEsperada == null || versionEsperada <= 0
                || accion == null || justificacion == null
                || justificacion.trim().length() < 20
                || justificacion.trim().length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos de decisión de anulación inválidos.");
        }
        return ejecutar("""
                SELECT public.sp_crm_decidir_solicitud_anulacion_v1(
                    CAST(? AS bigint), CAST(? AS bigint),
                    CAST(? AS integer), CAST(? AS varchar),
                    CAST(? AS text)
                )::text
                """, actor, idSolicitud, versionEsperada,
                accion.trim(), justificacion.trim());
    }

    @Transactional
    public JsonNode registrarRevisionFinancieraAnulacion(
            Long actor, Long idSolicitud, Integer versionEsperada,
            String resultado, String sustento) {

        validarActor(actor);
        if (idSolicitud == null || idSolicitud <= 0
                || versionEsperada == null || versionEsperada <= 0
                || resultado == null || sustento == null
                || sustento.trim().length() < 40
                || sustento.trim().length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Datos de revisión financiera inválidos.");
        }
        return ejecutar("""
                SELECT public.sp_crm_registrar_revision_financiera_anulacion_v1(
                    CAST(? AS bigint), CAST(? AS bigint),
                    CAST(? AS integer), CAST(? AS varchar),
                    CAST(? AS text)
                )::text
                """, actor, idSolicitud, versionEsperada,
                resultado.trim(), sustento.trim());
    }

    private void validarPaginacionAnulaciones(Integer pagina, Integer tamano) {
        if (pagina == null || pagina < 1 || pagina > 100000
                || tamano == null || tamano < 1 || tamano > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Paginación inválida: página 1-100000 y tamaño 1-100.");
        }
    }

    private void validarActor(Long actor) {

        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Sesion de usuario invalida.");
        }
    }

    private JsonNode ejecutar(
            String sql,
            Object... parametros) {

        final String respuesta;

        try {
            respuesta = jdbc.queryForObject(
                    sql,
                    String.class,
                    parametros);

        } catch (DataAccessException ex) {
            throw traducirError(ex);
        }

        if (respuesta == null) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "El procedimiento no devolvio respuesta.");
        }

        try {
            JsonNode resultado = jsonMapper.readTree(respuesta);

            if (resultado == null
                    || (!resultado.isObject() && !resultado.isArray())) {
                throw new IllegalStateException(
                        "Formato de respuesta inesperado.");
            }
            return resultado;

        } catch (JacksonException ex) {
            throw new IllegalStateException(
                    "Respuesta JSON invalida desde Supabase.",
                    ex);
        }
    }

    private ResponseStatusException mapearErrorSeparacion(String msg, DataAccessException ex) {
        if (msg.contains("fuera de su cartera") || msg.contains("No tiene autorizacion")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado para esta operacion.", ex);
        }
        if (msg.contains("no existe o esta inactivo") || msg.contains("no existe.")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurso no encontrado.", ex);
        }
        if (msg.contains("exactamente S/ 500.00") || msg.contains("comprobante de pago es obligatorio")
                || msg.contains("Formato de comprobante no permitido") || msg.contains("excede el tamano maximo")
                || msg.contains("requiere numero de operacion") || msg.contains("motivo claro de rechazo")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos invalidos para la separacion.", ex);
        }
        if (msg.contains("no se encuentra disponible") || msg.contains("ya cuenta con una reserva")
                || msg.contains("proceso de venta en curso") || msg.contains("ya fue evaluado")) {
            return new ResponseStatusException(HttpStatus.CONFLICT, "El lote o voucher no esta disponible.", ex);
        }
        return null;
    }

    /**
     * Errores funcionales de anulaciones y códigos heredados antes no alcanzables.
     * Evita que rechazos de negocio se devuelvan equivocadamente como HTTP 503.
     */
    private ResponseStatusException mapearErrorAnulacion(
            String mensaje, DataAccessException ex) {

        if (mensaje.contains("SOLICITUD_NO_EXISTE|")
                || mensaje.contains("EVIDENCIA_NO_EXISTE|")
                || mensaje.contains("VENTA_NO_EXISTE|")
                || mensaje.contains("OPERACION_NO_EXISTE|")
                || mensaje.contains("LOTE_NO_EXISTE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "La solicitud, evidencia o venta indicada no existe.", ex);
        }

        if (mensaje.contains("CONFIGURACION_INVALIDA|")) {
            return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "La configuración de Storage o del módulo requiere revisión.", ex);
        }

        if (mensaje.contains("SOLICITUD_DUPLICADA|")
                || mensaje.contains("VERSION_DESACTUALIZADA|")
                || mensaje.contains("SOLICITUD_CERRADA|")
                || mensaje.contains("SOLICITUD_NO_ADMISIBLE|")
                || mensaje.contains("TRANSICION_INVALIDA|")
                || mensaje.contains("OPERACION_NO_SOLICITABLE|")
                || mensaje.contains("OPERACION_INVALIDA|")
                || mensaje.contains("VENTA_NO_CANCELABLE|")
                || mensaje.contains("REVISION_OBLIGATORIA|")
                || mensaje.contains("REVISION_DESACTUALIZADA|")
                || mensaje.contains("REVISION_LEGAL_OBLIGATORIA|")
                || mensaje.contains("REVISION_LEGAL_DESACTUALIZADA|")
                || mensaje.contains("EVIDENCIA_REQUERIDA|")
                || mensaje.contains("EVIDENCIA_ALTERADA|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "La solicitud no cumple las condiciones actuales. Revise su estado y documentación.", ex);
        }

        return null;
    }

    private ResponseStatusException traducirError(
            DataAccessException ex) {

        StringBuilder errores = new StringBuilder();

        for (Throwable causa = ex; causa != null; causa = causa.getCause()) {

            if (causa.getMessage() != null) {
                errores.append(causa.getMessage()).append(' ');
            }
        }

        String mensaje = errores.toString();

        ResponseStatusException errorSep = mapearErrorSeparacion(mensaje, ex);
        if (errorSep != null) {
            return errorSep;
        }

        ResponseStatusException errorAnulacion = mapearErrorAnulacion(mensaje, ex);
        if (errorAnulacion != null) {
            return errorAnulacion;
        }

        // Imputación de dinero confirmado / reversión auditada 5.3.4.
        if(mensaje.contains("AUTOANULACION_DENEGADA|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La aplicación debe ser revertida por otra persona autorizada.",ex);
        }
        if(mensaje.contains("APLICACION_NO_DISPONIBLE|")
                ||mensaje.contains("PAGO_NO_DISPONIBLE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "El pago o la aplicación no está disponible para esta operación.",ex);
        }
        if(mensaje.contains("APLICACION_CERRADA|")
                ||mensaje.contains("SOLICITUD_DUPLICADA|")
                ||mensaje.contains("DESTINO_INVALIDO|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "La aplicación cambió de estado o el destino no corresponde al pago.",ex);
        }
        if(mensaje.contains("MONTO_NO_DISPONIBLE|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "El importe supera el saldo disponible del pago o del destino.",ex);
        }

        // Revisión independiente 5.3.3: no revelar vouchers de terceros.
        if(mensaje.contains("AUTOAPROBACION_DENEGADA|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Quien registró el comprobante no puede revisarlo.",ex);
        }
        if(mensaje.contains("VOUCHER_NO_DISPONIBLE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "El comprobante no está disponible para revisión de cuotas.",ex);
        }
        if(mensaje.contains("REVISION_CERRADA|")
                ||mensaje.contains("MONTO_NO_DISPONIBLE|")
                ||mensaje.contains("CUOTA_NO_DISPONIBLE|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "El comprobante ya fue revisado o la cuota cambió de estado. Actualice la bandeja.",ex);
        }

        // Errores funcionales del registro de cuotas (5.3.2).
        // Los identificadores ajenos y los archivos inexistentes no se revelan.
        if (mensaje.contains("CARGA_NO_DISPONIBLE|")
                || mensaje.contains("ARCHIVO_NO_EXISTE|")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No se encontró una carga o comprobante disponible para su usuario.", ex);
        }
        if (mensaje.contains("CARGA_EXPIRADA|")
                || mensaje.contains("CUOTA_NO_DISPONIBLE|")
                || mensaje.contains("PAGO_DUPLICADO|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "El comprobante no puede registrarse con su estado actual. Revise la cuota, fecha o número de operación.", ex);
        }
        if (mensaje.contains("IMPORTE_INVALIDO|")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El importe declarado supera el saldo real pendiente de la cuota.", ex);
        }

        if (mensaje.contains("VENTA_NO_DISPONIBLE|")
                || mensaje.contains("COMPROBANTE_NO_DISPONIBLE|")) {
            // Evita revelar si una venta existe fuera del alcance autorizado.
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se encontró la venta o el comprobante en su cartera autorizada.",
                    ex);
        }

        if (mensaje.contains("DENEGADO|")) {
            return new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "No tiene permisos para realizar esta operacion.",
                    ex);
        }

        if (mensaje.contains("PROSPECTO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El prospecto no existe o esta inactivo.",
                    ex);
        }

        if (mensaje.contains("DATOS_INVALIDOS|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Los datos comerciales son invalidos.",
                    ex);
        }

        if (mensaje.contains("PROSPECTO_NO_ELEGIBLE|")
                || mensaje.contains("YA_COMPRADOR|")
                || mensaje.contains("ASESOR_INVALIDO|")
                || mensaje.contains("LOTE_NO_DISPONIBLE|")
                || mensaje.contains("PROYECTO_INVALIDO|")
                || mensaje.contains("RESERVA_INVALIDA|")
                || mensaje.contains("VENTA_EXISTENTE|")
                || mensaje.contains("PRECIO_NO_COINCIDE|")
                || mensaje.contains("PRECIO_NO_DISPONIBLE|")) {

            if (mensaje.contains("VENTA_NO_EXISTE|")) {
                return new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "La venta solicitada no existe.",
                        ex);
            }

            if (mensaje.contains("VENTA_NO_CANCELABLE|")) {
                return new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La venta no puede cancelarse porque ya no cumple "
                                + "las condiciones de una operación pendiente.",
                        ex);
            }

            if (mensaje.contains("OPERACION_INVALIDA|")) {
                return new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La operación no superó las validaciones comerciales.",
                        ex);
            }

            if (mensaje.contains("CONFIGURACION_INVALIDA|")) {
                return new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "La configuración comercial requiere revisión.",
                        ex);
            }

            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La operacion no cumple las condiciones comerciales vigentes.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El contrato solicitado no existe.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_EDITABLE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no admite nuevas evidencias "
                            + "en su estado actual.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_NO_EXISTE|")) {
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "El archivo PDF no existe en Storage.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_INVALIDO|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El archivo no cumple las condiciones "
                            + "de almacenamiento seguro.",
                    ex);
        }

        if (mensaje.contains("ARCHIVO_DUPLICADO|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este archivo ya está asociado a un contrato.",
                    ex);
        }

        if (mensaje.contains("FIRMA_INVALIDA|")) {
            return new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La fecha o revisión de firma es inválida.",
                    ex);
        }

        if (mensaje.contains("FIRMA_SIN_EVIDENCIA|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no cuenta con un PDF válido y vigente.",
                    ex);
        }

        if (mensaje.contains("CONTRATO_NO_APROBABLE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El contrato no cumple las condiciones de aprobación.",
                    ex);
        }

        if (mensaje.contains("PLAN_INCONSISTENTE|")) {
            return new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El plan de pagos requiere revisión antes de aprobar.",
                    ex);
        }

        return new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No fue posible completar la operacion comercial.",
                ex);
    }

    @Transactional(readOnly = true)
    public JsonNode listarPdfReemplazosPendientes(
            Long actor, Long idContrato) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de contrato invalido.");
        }

        return ejecutar("""
                SELECT jsonb_build_object(
                    'items',
                    public.sp_crm_listar_pdf_reemplazos_pendientes_v6(
                        CAST(? AS bigint),
                        CAST(? AS bigint)
                    )
                )::text
                """,
                actor,
                idContrato).path("items");
    }

    @Transactional
    public JsonNode marcarPdfReemplazoEliminado(
            Long actor, Long idContrato, Long idReemplazo) {

        validarActor(actor);

        if (idContrato == null || idContrato <= 0
                || idReemplazo == null || idReemplazo <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificadores invalidos.");
        }

        return ejecutar("""
                SELECT public.sp_crm_marcar_pdf_reemplazo_eliminado_v6(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                actor,
                idContrato,
                idReemplazo);
    }

}