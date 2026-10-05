package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ZonaRequest;
import monolithe.core_service.dto.ZonaResponse;
import monolithe.core_service.service.ZonaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/zonas")
@RequiredArgsConstructor
public class ZonaController {

    private final ZonaService zonaService;

    @GetMapping("/proyecto/{idProyecto}")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<ZonaResponse>> listarPorProyecto(@PathVariable Long idProyecto) {
        return ResponseEntity.ok(zonaService.listarPorProyecto(idProyecto));
    }

    @GetMapping("/proyecto/{idProyecto}/activas")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<ZonaResponse>> listarActivasPorProyecto(@PathVariable Long idProyecto) {
        return ResponseEntity.ok(zonaService.listarActivasPorProyecto(idProyecto));
    }

    @GetMapping("/{idZona}")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<ZonaResponse> obtenerPorId(@PathVariable Long idZona) {
        return ResponseEntity.ok(zonaService.obtenerPorId(idZona));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<ZonaResponse> crear(@Valid @RequestBody ZonaRequest request) {
        ZonaResponse creada = zonaService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PutMapping("/{idZona}")
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<ZonaResponse> actualizar(
            @PathVariable Long idZona,
            @Valid @RequestBody ZonaRequest request
    ) {
        return ResponseEntity.ok(zonaService.actualizar(idZona, request));
    }

    @DeleteMapping("/{idZona}")
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<Void> desactivar(@PathVariable Long idZona) {
        zonaService.desactivar(idZona);
        return ResponseEntity.noContent().build();
    }
}
