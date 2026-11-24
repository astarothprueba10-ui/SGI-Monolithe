package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import monolithe.auth_service.service.FinancingPolicyPublicationService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

import java.util.Map;
import java.util.UUID;

/** Solo JWT de Gerencia; los permisos, el estado de la sesión y el TOTP se revalidan en SQL. */
@RestController
@RequestMapping("/api/auth/financing-policies")
public class FinancingPolicyController {
    private final FinancingPolicyPublicationService service;

    public FinancingPolicyController(FinancingPolicyPublicationService service) {
        this.service=service;
    }

    public record Propuesta(
        @NotNull @Positive Integer versionEsperada,
        @NotNull Map<String,Object> borrador
    ) {}
    public record Publicacion(
        @NotNull @Positive Integer versionEsperada,
        @NotNull Map<String,Object> borrador,
        @NotNull UUID autorizacionId,
        @NotNull UUID nonce,
        @NotNull Boolean confirmacionExplicita
    ) {}

    @GetMapping("/current")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<JsonNode> consultarActual(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.consultarActual(jwt));
    }

    @GetMapping("/projects/{idProyecto}")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<JsonNode> consultarProyecto(@AuthenticationPrincipal Jwt jwt,
            @PathVariable Long idProyecto) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.consultarProyecto(jwt,idProyecto));
    }

    @PostMapping("/preview")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<JsonNode> vistaPrevia(@AuthenticationPrincipal Jwt jwt,
          @Valid @RequestBody Propuesta req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.previsualizar(jwt,req.versionEsperada(),req.borrador()));
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAuthority('financing.configure')")
    public ResponseEntity<JsonNode> publicar(@AuthenticationPrincipal Jwt jwt,
          @Valid @RequestBody Publicacion req) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(service.publicar(jwt,req.versionEsperada(),req.borrador(),
                req.autorizacionId(),req.nonce(),req.confirmacionExplicita()));
    }
}
