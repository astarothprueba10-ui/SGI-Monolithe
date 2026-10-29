
package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.FormalizarVentaCrmRequest;
import monolithe.core_service.service.CrmVentaService;
import monolithe.core_service.dto.CancelarVentaPendienteRequest;
import monolithe.core_service.dto.RegistrarEvidenciaContratoRequest;
import monolithe.core_service.service.CrmContratoStorageService;
import monolithe.core_service.dto.ConfirmarFirmaContratoRequest;

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

        @PostMapping("/ventas/validar")
        @PreAuthorize("hasAuthority('sales.create')")
        public JsonNode validarVenta(
                        @AuthenticationPrincipal Jwt jwt,
                        @Valid @RequestBody FormalizarVentaCrmRequest request) {

                return service.validar(obtenerActor(jwt), request);
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

                                        } catch (Exception ex) {
                                                log.warn(
                                                                "Limpieza documental pendiente. Contrato {}, reemplazo {}",
                                                                idContrato, idReemplazo);
                                        }
                                }
                        }

                } catch (Exception ex) {
                        log.error(
                                        "Error consultando limpieza documental del contrato {}",
                                        idContrato,
                                        ex);
                }

                return resultado;
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
                } catch (Exception ex) {
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

                        } catch (Exception ex) {
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

                } catch (NumberFormatException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED,
                                        "Identidad de usuario invalida.");
                }
        }
}
