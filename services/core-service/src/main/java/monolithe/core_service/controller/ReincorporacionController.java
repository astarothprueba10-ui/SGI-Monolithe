package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ResolverReincorporacionRequest;
import monolithe.core_service.service.TrabajadorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/reincorporaciones")
@RequiredArgsConstructor
public class ReincorporacionController {

    private final TrabajadorService trabajadorService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.view')")
    public ResponseEntity<JsonNode> listar(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) Long idTrabajador,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(
                trabajadorService.listarReincorporaciones(idActor, estado, idTrabajador));
    }

    @PostMapping("/{idSolicitud}/resolver")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<JsonNode> resolver(
            @PathVariable Long idSolicitud,
            @RequestBody @Valid ResolverReincorporacionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(
                trabajadorService.resolverReincorporacion(idActor, idSolicitud, request));
    }

    private Long obtenerIdActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario autenticado.");
        }
        try {
            Long idActor = Long.valueOf(jwt.getSubject());
            if (idActor <= 0) {
                throw new NumberFormatException("Identificador de usuario invalido.");
            }
            return idActor;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "El identificador del usuario es invalido.");
        }
    }
}
