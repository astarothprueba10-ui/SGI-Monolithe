package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.PortalClienteService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
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
