package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AgendarVisitaCrmRequest;
import monolithe.core_service.dto.ActualizarEstadoVisitaCrmRequest;
import monolithe.core_service.service.CrmExpedienteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
public class CrmExpedienteController {
    private final CrmExpedienteService service;

    @GetMapping("/catalogos")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode catalogos(@AuthenticationPrincipal Jwt jwt) {
        return service.catalogos(idActor(jwt));
    }

    @GetMapping("/prospectos/{idProspecto}")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode detalle(@PathVariable Long idProspecto, @AuthenticationPrincipal Jwt jwt) {
        return service.detalle(idActor(jwt), idProspecto);
    }

    @GetMapping("/prospectos/{idProspecto}/visitas")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode visitas(@PathVariable Long idProspecto, @RequestParam(defaultValue = "100") Integer limite,
                           @AuthenticationPrincipal Jwt jwt) {
        return service.listarVisitas(idActor(jwt), idProspecto, limite);
    }

    @PostMapping("/prospectos/{idProspecto}/visitas")
    @PreAuthorize("hasAuthority('crm.edit')")
    public ResponseEntity<JsonNode> agendar(@PathVariable Long idProspecto,
                        @Valid @RequestBody AgendarVisitaCrmRequest request, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.agendar(idActor(jwt), idProspecto, request));
    }

    @PatchMapping("/visitas/{idVisita}/estado")
    @PreAuthorize("hasAuthority('crm.edit')")
    public JsonNode actualizarVisita(@PathVariable Long idVisita,
                        @Valid @RequestBody ActualizarEstadoVisitaCrmRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.actualizarVisita(idActor(jwt), idVisita, request);
    }

    private Long idActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        }
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id <= 0) throw new NumberFormatException("ID negativo");
            return id;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad JWT invalida.");
        }
    }
}
