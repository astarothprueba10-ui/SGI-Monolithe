package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ImportacionProyectoRequest;
import monolithe.core_service.dto.ImportacionProyectoResponse;
import monolithe.core_service.service.ImportacionProyectoService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
            @Valid @RequestBody ImportacionProyectoRequest request) {
        return service.confirmar(idProyecto, request);
    }
}
