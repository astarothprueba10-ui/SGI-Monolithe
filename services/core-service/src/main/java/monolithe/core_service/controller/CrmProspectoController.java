package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.RegistrarProspectoRequest;
import monolithe.core_service.service.CrmCaptacionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
public class CrmProspectoController {

    private final CrmCaptacionService servicio;

    @PostMapping("/prospectos")
    @PreAuthorize("hasAuthority('crm.create')")
    public ResponseEntity<JsonNode> registrarProspecto(
            @Valid @RequestBody RegistrarProspectoRequest solicitud,
            @AuthenticationPrincipal Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario autenticado.");
        }
        final Long idActor;
        try {
            idActor = Long.valueOf(jwt.getSubject());
            if (idActor <= 0) throw new NumberFormatException("ID no positivo");
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "La identidad del JWT no es valida.");
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicio.registrarProspecto(idActor, solicitud));
    }
}
