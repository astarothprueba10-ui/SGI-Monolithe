
package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.FormalizarVentaCrmRequest;
import monolithe.core_service.dto.CorregirDatosPersonalesCrmRequest;
import monolithe.core_service.service.CrmVentaService;
import monolithe.core_service.dto.CancelarVentaPendienteRequest;
import monolithe.core_service.dto.RegistrarEvidenciaContratoRequest;
import monolithe.core_service.service.CrmContratoStorageService;
import monolithe.core_service.dto.ConfirmarFirmaContratoRequest;
import monolithe.core_service.dto.RegistrarSeparacionCrmRequest;
import monolithe.core_service.dto.PrepararCargaVoucherSeparacionRequest;
import monolithe.core_service.dto.PrepararCargaVoucherVentaRequest;
import monolithe.core_service.dto.RevisarVoucherSeparacionRequest;
import monolithe.core_service.dto.EnlaceCargaVoucherResponse;
import monolithe.core_service.dto.EnlaceLecturaVoucherResponse;
import monolithe.core_service.service.CrmSeparacionStorageService;
import monolithe.core_service.service.CrmAnulacionStorageService;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;

import tools.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
@Slf4j
public class CrmVentaController {

        private final CrmVentaService service;
        private final CrmContratoStorageService storageService;
        private final CrmSeparacionStorageService separacionStorageService;
        private final CrmAnulacionStorageService anulacionStorageService;

        @PostMapping("/ventas/validar")
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode validarVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody FormalizarVentaCrmRequest request) {

                return service.validar(obtenerActor(jwt), request);
        }

        // Expediente de lote: lectura de operaciones comerciales con alcance por actor.
        @GetMapping("/lotes/{idLote}/historial-comercial")
        @PreAuthorize("hasAuthority('lots.view') and hasAuthority('sales.view')")
        public JsonNode historialComercialLote(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idLote) {
                return service.historialComercialLote(obtenerActor(jwt), idLote);
        }

        @GetMapping("/prospectos/{idProspecto}/lotes-reservados")
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode listarLotesReservadosDelProspecto(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idProspecto) {

                return service.listarLotesReservadosDelProspecto(
                                obtenerActor(jwt),
                                idProspecto);
        }

        @GetMapping("/prospectos/{idProspecto}/datos-comprador-venta")
        @PreAuthorize("hasAuthority('sales.create') and hasAuthority('crm.view')")
        public JsonNode datosCompradorParaVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idProspecto) {
                return service.datosCompradorParaVenta(obtenerActor(jwt), idProspecto);
        }

        @GetMapping("/prospectos/{idProspecto}/reservas-vigentes-venta")
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode listarReservasVigentesParaVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idProspecto) {
                return service.listarReservasVigentesParaVenta(
                                obtenerActor(jwt), idProspecto);
        }

        @GetMapping("/prospectos/{idProspecto}/verificar-compra")
        @PreAuthorize("hasAuthority('crm.view')")
        public JsonNode verificarComprador(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idProspecto) {

                return service.verificarComprador(
                                obtenerActor(jwt),
                                idProspecto);
        }

        @PostMapping("/ventas/pendientes")
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode registrarVentaPendiente(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody FormalizarVentaCrmRequest request) {

                return service.registrarVentaPendiente(
                                obtenerActor(jwt),
                                request);
        }

        @PostMapping("/ventas/preparar-comprobante")
        @PreAuthorize("hasAuthority('sales.create')")
        public EnlaceCargaVoucherResponse prepararComprobanteVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody PrepararCargaVoucherVentaRequest request) {
                return separacionStorageService.prepararCargaVenta(obtenerActor(jwt), request);
        }

        @PostMapping("/separaciones/preparar-comprobante")
        @PreAuthorize("hasAuthority('sales.create')")
        public EnlaceCargaVoucherResponse prepararComprobanteSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody PrepararCargaVoucherSeparacionRequest request) {

                return separacionStorageService.prepararCarga(
                                obtenerActor(jwt),
                                request);
        }

        @PostMapping("/separaciones")
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode registrarSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody RegistrarSeparacionCrmRequest request) {

                return service.registrarSeparacion(
                                obtenerActor(jwt),
                                request);
        }

        @PostMapping("/finanzas/conciliaciones/separaciones/{idPago}/conciliar")
        @PreAuthorize("hasAuthority('finance.edit')")
        public JsonNode conciliarPagoSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idPago,
                        @Valid @RequestBody ConciliarPagoSeparacionRequest request) {

                return service.conciliarPagoSeparacion(
                                obtenerActor(jwt),
                                idPago,
                                request.idCuentaFinanciera(),
                                request.idCategoria());
        }

        @GetMapping("/finanzas/conciliaciones/separaciones")
        @PreAuthorize("hasAuthority('finance.view')")
        public JsonNode listarConciliacionesSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(defaultValue = "TODOS") String estado,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarConciliacionesSeparacion(
                                obtenerActor(jwt),
                                estado,
                                busqueda,
                                pagina,
                                tamano);
        }

        @GetMapping("/separaciones/vouchers")
        @PreAuthorize("hasAuthority('finance.view')")
        public JsonNode listarVouchersSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String estado,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarVouchersSeparacion(
                                obtenerActor(jwt),
                                estado,
                                busqueda,
                                pagina,
                                tamano);
        }

        /** URL de solo lectura y corta duracion para el comprobante de una separacion. */
        @GetMapping("/separaciones/{idReserva}/comprobante/url-firmada")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<EnlaceLecturaVoucherResponse> leerComprobanteSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idReserva) {

                var enlace = separacionStorageService.prepararLecturaPorReserva(
                                obtenerActor(jwt),
                                idReserva);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        @GetMapping("/separaciones/vouchers/{idVoucher}/url-firmada")
        @PreAuthorize("hasAuthority('finance.view')")
        public ResponseEntity<EnlaceLecturaVoucherResponse> prepararLecturaVoucher(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idVoucher) {

                var enlace = separacionStorageService.prepararLectura(
                                obtenerActor(jwt),
                                idVoucher);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        @PutMapping("/separaciones/vouchers/{idVoucher}/decision")
        @PreAuthorize("hasAuthority('finance.edit')")
        public JsonNode revisarVoucherSeparacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idVoucher,
                        @Valid @RequestBody RevisarVoucherSeparacionRequest request) {

                return service.revisarVoucherSeparacion(
                                obtenerActor(jwt),
                                idVoucher,
                                request);
        }

        @GetMapping("/prospectos/{idProspecto}/datos-personales")
        @PreAuthorize("hasAuthority('crm.view')")
        public ResponseEntity<JsonNode> datosPersonalesCrm(
                @AuthenticationPrincipal Jwt jwt,@PathVariable Long idProspecto) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.datosPersonalesCrm(obtenerActor(jwt),idProspecto));
        }

        @PatchMapping("/prospectos/{idProspecto}/datos-personales")
        @PreAuthorize("hasAuthority('crm.edit')")
        public ResponseEntity<JsonNode> corregirDatosPersonalesCrm(
                @AuthenticationPrincipal Jwt jwt,@PathVariable Long idProspecto,
                @Valid @RequestBody CorregirDatosPersonalesCrmRequest request) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.corregirDatosPersonalesCrm(
                            obtenerActor(jwt),idProspecto,request.datos(),request.motivo()));
        }

        @GetMapping("/prospectos/buscar-sin-periodo")
        @PreAuthorize("hasAuthority('crm.view')")
        public ResponseEntity<JsonNode> buscarCarteraSinPeriodo(
                @AuthenticationPrincipal Jwt jwt,
                @RequestParam(required=false) String consulta,
                @RequestParam(required=false) String etapa,
                @RequestParam(required=false) String origen,
                @RequestParam(required=false) Long idAsesor,
                @RequestParam(required=false) Boolean sinAsignar,
                @RequestParam(defaultValue="TODOS") String categoria,
                @RequestParam(defaultValue="1") Integer pagina,
                @RequestParam(defaultValue="15") Integer tamano,
                @RequestParam(required=false) Long idProyecto) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
                    service.buscarCarteraSinPeriodo(obtenerActor(jwt),
                    consulta,etapa,origen,idAsesor,sinAsignar,categoria,pagina,tamano,idProyecto));
        }

        @GetMapping("/operaciones")
        @PreAuthorize("hasAuthority('sales.view')")
        public JsonNode listarOperaciones(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String tipo,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarOperaciones(
                                obtenerActor(jwt),
                                tipo,
                                busqueda,
                                pagina,
                                tamano);
        }

        /** Expediente del comprador, domicilio, pago y plan financiero: solo lectura. */
        @GetMapping("/ventas/{idVenta}/cronograma")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<JsonNode> cronogramaVenta(
                @AuthenticationPrincipal Jwt jwt,@PathVariable Long idVenta) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.cronogramaVenta(obtenerActor(jwt),idVenta));
        }

        /** Alerta dinámica de cuotas: sin información fuera de la cartera del JWT. */
        @GetMapping("/financiamiento/alertas")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<JsonNode> alertasCuotas(
                @AuthenticationPrincipal Jwt jwt,
                @RequestParam(defaultValue = "TODAS") String tipo,
                @RequestParam(defaultValue = "1") Integer pagina,
                @RequestParam(defaultValue = "20") Integer tamano) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.alertasCuotas(obtenerActor(jwt), tipo, pagina, tamano));
        }

        /** Operación explícita para avisos internos; NO envía correo. */
        @PostMapping("/financiamiento/alertas/portal/preparar")
        @PreAuthorize("hasAuthority('financing.approve')")
        public ResponseEntity<JsonNode> prepararAvisosCuotasPortal(
                @AuthenticationPrincipal Jwt jwt,
                @RequestParam(defaultValue = "100") Integer limite) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.prepararAvisosCuotasPortal(obtenerActor(jwt), limite));
        }

        /** Saldo registrado por venta: aplicaciones confirmadas, no comprobantes pendientes. */
        @GetMapping("/ventas/{idVenta}/saldo")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<JsonNode> saldoVenta(
                @AuthenticationPrincipal Jwt jwt, @PathVariable Long idVenta) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.saldoVenta(obtenerActor(jwt), idVenta));
        }

        /** Consolidado por cliente titular, únicamente de ventas visibles al usuario. */
        @GetMapping("/clientes/{idCliente}/saldo")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<JsonNode> saldoCliente(
                @AuthenticationPrincipal Jwt jwt, @PathVariable Long idCliente) {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(service.saldoCliente(obtenerActor(jwt), idCliente));
        }

        @GetMapping("/ventas/{idVenta}/detalle")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<JsonNode> detalleVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idVenta) {
                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(service.detalleVenta(obtenerActor(jwt), idVenta));
        }

        /** Firma temporal cada archivo, sin exponer el bucket ni permitir descargas públicas. */
        @GetMapping("/ventas/{idVenta}/comprobantes/{idComprobante}/url-firmada")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<EnlaceLecturaVoucherResponse> visualizarComprobanteVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idVenta,
                        @PathVariable Long idComprobante) {
                var enlace = separacionStorageService.prepararLecturaComprobanteVenta(
                                obtenerActor(jwt), idVenta, idComprobante);
                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        /** Exportación de cartera de ventas: validación JWT y SQL, nunca datos globales sin rol. */
        @GetMapping("/ventas/exportacion")
        @PreAuthorize("hasAuthority('sales.view') and hasAuthority('sales.export')")
        public ResponseEntity<JsonNode> exportarVentas(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "100") Integer tamano) {
                return ResponseEntity.ok()
                        .cacheControl(CacheControl.noStore())
                        .body(service.listarVentasParaExportacion(
                                obtenerActor(jwt), pagina, tamano));
        }

        /** Exportacion paginada y exclusiva de separaciones. Permisos tambien verificados en BD. */
        @GetMapping("/separaciones/exportacion")
        @PreAuthorize("hasAuthority('sales.view') and hasAuthority('sales.export')")
        public ResponseEntity<JsonNode> exportarSeparaciones(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "100") Integer tamano) {
                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(service.listarSeparacionesParaExportacion(
                                                obtenerActor(jwt), pagina, tamano));
        }

        @PostMapping("/ventas/{idVenta}/cancelar")
        @PreAuthorize("hasAuthority('sales.reject')")
        public JsonNode cancelarVentaPendiente(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idVenta,
                        @Valid @RequestBody CancelarVentaPendienteRequest request) {

                return service.cancelarVentaPendiente(
                                obtenerActor(jwt),
                                idVenta,
                                request);
        }

        @PostMapping("/contratos/{idContrato}/evidencias")
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasAuthority('sales.edit')")
        public JsonNode registrarEvidenciaContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @Valid @RequestBody RegistrarEvidenciaContratoRequest request) {

                Long actor = obtenerActor(jwt);

                JsonNode resultado = service.registrarEvidenciaContrato(
                                actor, idContrato, request);

                if (!resultado.path("success").asBoolean(false)) {
                        return resultado;
                }

                try {
                        JsonNode pendientes = service.listarPdfReemplazosPendientes(
                                        actor, idContrato);

                        if (pendientes.isArray()) {
                                for (JsonNode pendiente : pendientes) {

                                        Long idReemplazo = pendiente
                                                        .path("idReemplazo").asLong(0L);

                                        String claveAnterior = pendiente
                                                        .path("claveAnterior").asString("");

                                        if (idReemplazo <= 0 || claveAnterior.isBlank()) {
                                                log.warn(
                                                                "Referencia de limpieza invalida para contrato {}",
                                                                idContrato);
                                                continue;
                                        }

                                        try {
                                                storageService.eliminarPdfAnterior(
                                                                idContrato, claveAnterior);

                                                service.marcarPdfReemplazoEliminado(
                                                                actor, idContrato, idReemplazo);

                                        }

                                        catch (Exception ex) {
                                                log.warn(
                                                                "Limpieza documental pendiente. Contrato {}, reemplazo {}",
                                                                idContrato, idReemplazo);
                                        }

                                }

                        }

                }

                catch (Exception ex) {
                        log.error(
                                        "Error consultando limpieza documental del contrato {}",
                                        idContrato,
                                        ex);
                }

                return resultado;
        }

        @PostMapping("/contratos/{idContrato}/anexos")
        @PreAuthorize("hasAuthority('sales.edit')")
        public JsonNode registrarAnexoContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @Valid @RequestBody RegistrarAnexoContratoRequest request) {

                return storageService.registrarAnexoVerificado(
                                obtenerActor(jwt),
                                idContrato,
                                request.tipoAnexo(),
                                request.claveArchivo(),
                                request.nombreOriginal());
        }

        @PostMapping("/contratos/{idContrato}/anexos/preparar-carga")
        @PreAuthorize("hasAuthority('sales.edit')")
        public CrmContratoStorageService.EnlaceCargaPdf prepararCargaAnexoContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @Valid @RequestBody PrepararCargaAnexoRequest request) {

                return storageService.prepararCargaAnexo(
                                obtenerActor(jwt),
                                idContrato,
                                request.tipoAnexo());
        }

        @PostMapping("/contratos/{idContrato}/evidencias/preparar-carga")
        @PreAuthorize("hasAuthority('sales.edit')")
        public CrmContratoStorageService.EnlaceCargaPdf prepararCargaContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato) {

                return storageService.prepararCarga(
                                obtenerActor(jwt),
                                idContrato);
        }

        @PostMapping("/contratos/{idContrato}/evidencias/reintentar-limpieza")
        @PreAuthorize("hasAuthority('sales.edit')")
        public java.util.Map<String, Integer> reintentarLimpiezaPdf(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato) {

                Long actor = obtenerActor(jwt);

                JsonNode pendientes;

                try {
                        pendientes = service.listarPdfReemplazosPendientes(
                                        actor, idContrato);
                }

                catch (Exception ex) {
                        log.error(
                                        "Error consultando reemplazos del contrato {}",
                                        idContrato, ex);
                        throw ex;
                }

                if (!pendientes.isArray()) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "Respuesta de limpieza invalida.");
                }

                int eliminados = 0;
                int fallidos = 0;

                for (JsonNode pendiente : pendientes) {

                        Long idReemplazo = pendiente
                                        .path("idReemplazo").asLong(0L);

                        String claveAnterior = pendiente
                                        .path("claveAnterior").asString("");

                        if (idReemplazo <= 0 || claveAnterior.isBlank()) {
                                fallidos++;
                                log.error(
                                                "Referencia de limpieza invalida. Contrato {}",
                                                idContrato);
                                continue;
                        }

                        try {
                                storageService.eliminarPdfAnterior(
                                                idContrato, claveAnterior);

                                service.marcarPdfReemplazoEliminado(
                                                actor, idContrato, idReemplazo);

                                eliminados++;

                        }

                        catch (Exception ex) {
                                fallidos++;
                                log.error(
                                                "Error eliminando PDF anterior. Contrato {}, reemplazo {}",
                                                idContrato, idReemplazo, ex);
                        }

                }

                return java.util.Map.of(
                                "eliminados", eliminados,
                                "fallidos", fallidos);
        }

        @GetMapping("/contratos/{idContrato}/anexos")
        @PreAuthorize("hasAuthority('sales.view')")
        public JsonNode listarAnexosContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato) {

                return service.listarAnexosContrato(
                                obtenerActor(jwt),
                                idContrato);
        }

        @GetMapping("/contratos/documentacion")
        @PreAuthorize("hasAuthority('sales.view')")
        public JsonNode listarContratosDocumentacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarContratosDocumentacion(
                                obtenerActor(jwt),
                                busqueda,
                                pagina,
                                tamano);
        }

        @GetMapping("/contratos/pendientes")
        @PreAuthorize("hasAuthority('sales.view')")
        public JsonNode listarContratosPendientes(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarContratosPendientes(
                                obtenerActor(jwt),
                                busqueda,
                                pagina,
                                tamano);
        }

        @PostMapping("/contratos/{idContrato}/pdf-aprobado/preparar-lectura")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<CrmContratoStorageService.EnlaceLecturaPdf> prepararLecturaContratoAprobado(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato) {

                var enlace = storageService.prepararLecturaAprobado(
                                obtenerActor(jwt),
                                idContrato);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        @PostMapping("/contratos/{idContrato}/aprobar-firma")
        @PreAuthorize("hasAuthority('sales.approve')")
        public JsonNode aprobarFirmaContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @Valid @RequestBody ConfirmarFirmaContratoRequest request) {

                return service.aprobarFirmaContrato(
                                obtenerActor(jwt),
                                idContrato,
                                request);
        }

        @PostMapping("/contratos/{idContrato}/anexos/{idAnexo}/preparar-lectura")
        @PreAuthorize("hasAuthority('sales.view')")
        public ResponseEntity<CrmContratoStorageService.EnlaceLecturaAnexo> prepararLecturaAnexoContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @PathVariable Long idAnexo) {

                var enlace = storageService.prepararLecturaAnexo(
                                obtenerActor(jwt),
                                idContrato,
                                idAnexo);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        @PostMapping("/contratos/{idContrato}/evidencias/{idContratoArchivo}/preparar-lectura")
        @PreAuthorize("hasAuthority('sales.approve')")
        public ResponseEntity<CrmContratoStorageService.EnlaceLecturaPdf> prepararLecturaContrato(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idContrato,
                        @PathVariable Long idContratoArchivo) {

                var enlace = storageService.prepararLectura(
                                obtenerActor(jwt),
                                idContrato,
                                idContratoArchivo);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        public record ConciliarPagoSeparacionRequest(
                        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long idCuentaFinanciera,

                        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long idCategoria) {
        }

        public record PrepararCargaAnexoRequest(
                        @jakarta.validation.constraints.NotBlank String tipoAnexo) {
        }

        public record RegistrarAnexoContratoRequest(

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp = "PLANO_LOTE|MEMORIA_DESCRIPTIVA") String tipoAnexo,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 512) String claveArchivo,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 255) String nombreOriginal) {
        }

        @PostMapping("/anulaciones/{idSolicitud}/evidencias-legales/preparar-carga")
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.approve')")
        public ResponseEntity<CrmContratoStorageService.EnlaceCargaPdf> prepararCargaEvidenciaLegal(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud) {

                var enlace = anulacionStorageService.prepararCarga(
                                obtenerActor(jwt),
                                idSolicitud);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(enlace);
        }

        @PostMapping("/anulaciones/{idSolicitud}/evidencias-legales")
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.approve')")
        public ResponseEntity<JsonNode> registrarEvidenciaLegal(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud,
                        @Valid @RequestBody RegistrarEvidenciaLegalRequest request) {

                JsonNode resultado = anulacionStorageService.registrarEvidenciaLegalVerificada(
                                obtenerActor(jwt),
                                idSolicitud,
                                request.tipoDocumento(),
                                request.claveArchivo(),
                                request.nombreOriginal());

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(resultado);
        }

        public record RegistrarEvidenciaLegalRequest(

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp = "INFORME_LEGAL|ACUERDO_RESOLUCION|CARTA_NOTARIAL|OTRO_SUSTENTO") String tipoDocumento,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 320) String claveArchivo,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 240) String nombreOriginal) {
        }

        @GetMapping("/anulaciones/{idSolicitud}/evidencias-legales")
        @PreAuthorize("hasAuthority('annulments.view') and hasAnyAuthority('annulments.approve','annulments.review_legal')")
        public ResponseEntity<JsonNode> listarEvidenciasLegales(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud) {

                JsonNode resultado = service.listarEvidenciasLegales(
                                obtenerActor(jwt), idSolicitud);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(resultado);
        }

        @PostMapping("/anulaciones/{idSolicitud}/evidencias-legales/{idEvidencia}/preparar-lectura")
        @PreAuthorize("hasAuthority('annulments.view') and hasAnyAuthority('annulments.approve','annulments.review_legal')")
        public ResponseEntity<CrmAnulacionStorageService.EnlaceLecturaEvidenciaLegal> prepararLecturaEvidenciaLegal(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud,
                        @PathVariable Long idEvidencia) {

                var resultado = anulacionStorageService.prepararLectura(
                                obtenerActor(jwt), idSolicitud, idEvidencia);

                return ResponseEntity.ok()
                                .cacheControl(CacheControl.noStore())
                                .body(resultado);
        }

        @GetMapping("/anulaciones/revision-legal/pendientes")
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.review_legal')")
        public JsonNode listarCasosRevisionLegal(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return service.listarCasosRevisionLegal(
                                obtenerActor(jwt), pagina, tamano);
        }

        @PostMapping("/anulaciones/{idSolicitud}/revision-legal")
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.review_legal')")
        public JsonNode registrarRevisionLegal(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud,
                        @Valid @RequestBody DictamenLegalRequest request) {

                return service.registrarRevisionLegal(
                                obtenerActor(jwt),
                                idSolicitud,
                                request.versionEsperada(),
                                request.resultado(),
                                request.sustento(),
                                request.idEvidencia());
        }

        public record DictamenLegalRequest(
                        @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Integer versionEsperada,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Pattern(regexp = "CONFORME|OBSERVADA|NO_PROCEDE") String resultado,

                        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min = 40, max = 2000) String sustento,

                        @jakarta.validation.constraints.Positive Long idEvidencia) {
        }

        // ===== CRM: solicitudes de anulación y revisiones independientes =====
        @PostMapping("/anulaciones/solicitudes")
        @ResponseStatus(HttpStatus.CREATED)
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.create')")
        public JsonNode solicitarAnulacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody SolicitarAnulacionRequest request) {

                return service.solicitarAnulacion(
                                obtenerActor(jwt), request.tipoOperacion(),
                                request.idOperacion(), request.categoriaMotivo(),
                                request.motivo());
        }

        @GetMapping("/anulaciones/solicitudes")
        @PreAuthorize("hasAuthority('annulments.view')")
        public ResponseEntity<JsonNode> listarSolicitudesAnulacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String tipo,
                        @RequestParam(required = false) String estado,
                        @RequestParam(required = false) String busqueda,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                .body(service.listarSolicitudesAnulacion(
                                                obtenerActor(jwt), tipo, estado,
                                                busqueda, pagina, tamano));
        }

        @GetMapping("/anulaciones/historial")
        @PreAuthorize("hasAuthority('annulments.view')")
        public ResponseEntity<JsonNode> listarHistorialAnulaciones(
                        @AuthenticationPrincipal Jwt jwt,
                        @RequestParam(required = false) String tipo,
                        @RequestParam(required = false) Long idOperacion,
                        @RequestParam(defaultValue = "1") Integer pagina,
                        @RequestParam(defaultValue = "20") Integer tamano) {

                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                .body(service.listarHistorialAnulaciones(
                                                obtenerActor(jwt), tipo, idOperacion,
                                                pagina, tamano));
        }

        @PostMapping("/anulaciones/solicitudes/{idSolicitud}/decision")
        @PreAuthorize("hasAuthority('annulments.view') and hasAnyAuthority('annulments.approve','annulments.reject')")
        public ResponseEntity<JsonNode> decidirSolicitudAnulacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud,
                        @Valid @RequestBody DecisionAnulacionRequest request) {

                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                .body(service.decidirSolicitudAnulacion(
                                                obtenerActor(jwt), idSolicitud,
                                                request.versionEsperada(), request.accion(),
                                                request.justificacion()));
        }

        @PostMapping("/anulaciones/solicitudes/{idSolicitud}/revision-financiera")
        @PreAuthorize("hasAuthority('annulments.view') and hasAuthority('annulments.review_finance')")
        public ResponseEntity<JsonNode> registrarRevisionFinancieraAnulacion(
                        @AuthenticationPrincipal Jwt jwt,
                        @PathVariable Long idSolicitud,
                        @Valid @RequestBody RevisionFinancieraAnulacionRequest request) {

                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                .body(service.registrarRevisionFinancieraAnulacion(
                                                obtenerActor(jwt), idSolicitud,
                                                request.versionEsperada(), request.resultado(),
                                                request.sustento()));
        }

        public record SolicitarAnulacionRequest(
                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Pattern(regexp = "VENTA|SEPARACION")
                        String tipoOperacion,

                        @jakarta.validation.constraints.NotNull
                        @jakarta.validation.constraints.Positive
                        Long idOperacion,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Pattern(
                                        regexp = "DESISTIMIENTO_CLIENTE|MUTUO_ACUERDO|ERROR_COMERCIAL|INCUMPLIMIENTO|OTRO")
                        String categoriaMotivo,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Size(min = 20, max = 2000)
                        String motivo) {
        }

        public record DecisionAnulacionRequest(
                        @jakarta.validation.constraints.NotNull
                        @jakarta.validation.constraints.Positive
                        Integer versionEsperada,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Pattern(
                                        regexp = "INICIAR_REVISION|DERIVAR_FINANZAS|DERIVAR_LEGAL|APROBAR|RECHAZAR")
                        String accion,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Size(min = 20, max = 2000)
                        String justificacion) {
        }

        public record RevisionFinancieraAnulacionRequest(
                        @jakarta.validation.constraints.NotNull
                        @jakarta.validation.constraints.Positive
                        Integer versionEsperada,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Pattern(
                                        regexp = "CONFORME|OBSERVADA|NO_PROCEDE")
                        String resultado,

                        @jakarta.validation.constraints.NotBlank
                        @jakarta.validation.constraints.Size(min = 40, max = 2000)
                        String sustento) {
        }

        private static Long obtenerActor(Jwt jwt) {

                if (jwt == null || jwt.getSubject() == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Sesion JWT requerida.");
                }

                try {
                        Long idActor = Long.valueOf(jwt.getSubject());

                        if (idActor <= 0) {
                                throw new NumberFormatException();
                        }

                        return idActor;

                }

                catch (NumberFormatException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Identidad de usuario invalida.");
                }

        }

}
