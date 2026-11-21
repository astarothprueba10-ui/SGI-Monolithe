package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ImportacionProyectoRequest;
import monolithe.core_service.dto.ImportacionProyectoResponse;
import monolithe.core_service.service.ImportacionProyectoService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/core/proyectos/{idProyecto}/importacion")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
public class ImportacionProyectoController {
    private final ImportacionProyectoService service;

    @PostMapping("/validar")
    public ImportacionProyectoResponse validar(@PathVariable Long idProyecto,
            @Valid @RequestBody ImportacionProyectoRequest request) {
        return service.previsualizar(idProyecto, request);
    }

    @PostMapping("/confirmar")
    public ImportacionProyectoResponse confirmar(@PathVariable Long idProyecto,
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ImportacionProyectoRequest request) {
        return service.confirmar(idProyecto, request, actor(jwt));
    }

    private Long actor(Jwt jwt) {
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id > 0) return id;
        } catch (RuntimeException ignored) {
            // El actor únicamente procede del JWT autenticado.
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de usuario inválida.");
    }
}
