package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AsignarAsesorCrmRequest;
import monolithe.core_service.dto.CambiarEtapaCrmRequest;
import monolithe.core_service.dto.RegistrarSeguimientoCrmRequest;
import monolithe.core_service.service.CrmGestionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm/prospectos")
@RequiredArgsConstructor
public class CrmGestionController {
    private final CrmGestionService service;

    @PatchMapping("/{idProspecto}/etapa")
    @PreAuthorize("hasAuthority('crm.edit')")
    public JsonNode cambiarEtapa(@PathVariable Long idProspecto,
            @Valid @RequestBody CambiarEtapaCrmRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.cambiarEtapa(idActor(jwt), idProspecto, request);
    }

    @PutMapping("/{idProspecto}/asesor")
    @PreAuthorize("hasAuthority('crm.edit')")
    public JsonNode asignarAsesor(@PathVariable Long idProspecto,
            @Valid @RequestBody AsignarAsesorCrmRequest request, @AuthenticationPrincipal Jwt jwt) {
        return service.asignarAsesor(idActor(jwt), idProspecto, request);
    }

    @PostMapping("/{idProspecto}/seguimientos")
    @PreAuthorize("hasAuthority('crm.edit')")
    public ResponseEntity<JsonNode> registrarSeguimiento(@PathVariable Long idProspecto,
            @Valid @RequestBody RegistrarSeguimientoCrmRequest request, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                service.registrarSeguimiento(idActor(jwt), idProspecto, request));
    }

    @GetMapping("/{idProspecto}/seguimientos")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode listarSeguimientos(@PathVariable Long idProspecto,
            @RequestParam(defaultValue = "100") Integer limite, @AuthenticationPrincipal Jwt jwt) {
        return service.listarSeguimientos(idActor(jwt), idProspecto, limite);
    }

    private Long idActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No existe una identidad valida en el JWT.");
        }
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de JWT invalida.");
        }
    }
}
