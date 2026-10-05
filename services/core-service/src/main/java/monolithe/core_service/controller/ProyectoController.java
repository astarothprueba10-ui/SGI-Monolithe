package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.dto.ProyectoResponse;
import monolithe.core_service.service.ProyectoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/proyectos")
@RequiredArgsConstructor
public class ProyectoController {

    private final ProyectoService proyectoService;

    @GetMapping
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<ProyectoResponse>> listarTodos() {
        return ResponseEntity.ok(
                proyectoService.listarTodos()
        );
    }

    @GetMapping("/activos")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<ProyectoResponse>> listarActivos() {
        return ResponseEntity.ok(
                proyectoService.listarActivos()
        );
    }

    @GetMapping("/{idProyecto}")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<ProyectoResponse> obtenerPorId(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                proyectoService.obtenerPorId(idProyecto)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('projects.create')")
    public ResponseEntity<ProyectoResponse> crear(
            @Valid @RequestBody ProyectoRequest request
    ) {
        ProyectoResponse creado =
                proyectoService.crear(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(creado);
    }

    @PutMapping("/{idProyecto}")
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<ProyectoResponse> actualizar(
            @PathVariable Long idProyecto,
            @Valid @RequestBody ProyectoRequest request
    ) {
        return ResponseEntity.ok(
                proyectoService.actualizar(
                        idProyecto,
                        request
                )
        );
    }

    @DeleteMapping("/{idProyecto}")
    @PreAuthorize("hasAuthority('projects.delete')")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long idProyecto
    ) {
        proyectoService.desactivar(idProyecto);

        return ResponseEntity
                .noContent()
                .build();
    }
}