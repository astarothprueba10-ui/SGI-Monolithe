package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.PortalClienteService;
import monolithe.core_service.service.PortalDocumentoStorageService;
import monolithe.core_service.service.CrmSeparacionStorageService;
import monolithe.core_service.dto.PortalPrepararVoucherRequest;
import monolithe.core_service.dto.EnlaceCargaVoucherCuotaResponse;
import monolithe.core_service.dto.RegistrarVoucherCuotaPendienteRequest;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

/**
 * Portal aislado del Backoffice: no recibe ID de usuario, venta o cliente.
 * Toda consulta utiliza identidad JWT verificada y scoping SQL.
 */
@RestController
@RequestMapping("/api/core/portal-cliente")
@RequiredArgsConstructor
public class PortalClienteController {
    private final PortalClienteService service;
    private final CrmSeparacionStorageService storageService;
    private final PortalDocumentoStorageService documentosStorage;

    /** 5.4.5: lista publicada, sin claves de archivos ni enlaces firmados. */
    @GetMapping("/documentos")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> documentos(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.documentosPrivados(obtenerActor(jwt)));
    }

    /** Solo después de revalidar titularidad, publicación y objeto en Storage. */
    @GetMapping("/documentos/{tipo}/{idDocumento}/url-firmada")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<PortalDocumentoStorageService.EnlaceLecturaPortal> enlaceDocumento(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String tipo,@PathVariable Long idDocumento) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(documentosStorage.firmarLectura(obtenerActor(jwt),tipo,idDocumento));
    }

    /** Alertas privadas calculadas, sin notificaciones de otros módulos. */
    @GetMapping("/alertas")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> alertas(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.alertasPrivadas(obtenerActor(jwt)));
    }

    /** 5.4.4: comprobantes y cuotas propias, sin nombres ni rutas de Storage. */
    @GetMapping("/vouchers")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> vouchers(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.vouchersPrivados(obtenerActor(jwt)));
    }

    /** Prepara un archivo privado después de la autorización SQL de la venta. */
    @PostMapping("/vouchers/preparar-carga")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<EnlaceCargaVoucherCuotaResponse> prepararVoucher(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PortalPrepararVoucherRequest request) {
        JsonNode preautorizacion = service.prepararVoucherPrivado(
                obtenerActor(jwt),request);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(storageService.firmarCargaPortal(preautorizacion,request.tipoMime()));
    }

    /** No confirma dinero: registra pago REGISTRADO y voucher PENDIENTE. */
    @PostMapping("/vouchers/registrar")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> registrarVoucher(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody RegistrarVoucherCuotaPendienteRequest request,
            @org.springframework.web.bind.annotation.RequestParam String destino) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.registrarVoucherPrivado(
                        obtenerActor(jwt),request.idCarga(),destino));
    }

    /** 5.4.3: cuotas, saldos y aplicaciones confirmadas de compras propias. */
    @GetMapping("/cronograma")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> cronograma(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.cronogramaPrivado(obtenerActor(jwt)));
    }

    /** Expediente inmobiliario y contratos: solo metadatos de ventas propias. */
    @GetMapping("/lotes-contratos")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> lotesContratos(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.lotesContratosPrivados(obtenerActor(jwt)));
    }

    @GetMapping("/resumen")
    @PreAuthorize("hasAuthority('ROLE_CLIENTE')")
    public ResponseEntity<JsonNode> resumen(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(service.resumenPrivado(obtenerActor(jwt)));
    }

    private static long obtenerActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "La sesión del cliente no está disponible.");
        }
        final long actor;
        try {
            actor = Long.parseLong(jwt.getSubject());
            if (actor <= 0) throw new NumberFormatException();
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Identidad de sesión inválida.");
        }
        return actor;
    }
}
