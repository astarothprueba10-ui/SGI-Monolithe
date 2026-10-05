package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.TarifaZonaEtapaRequest;
import monolithe.core_service.dto.TarifaZonaEtapaResponse;
import monolithe.core_service.service.TarifaZonaEtapaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/tarifas")
@RequiredArgsConstructor
public class TarifaZonaEtapaController {

    private final TarifaZonaEtapaService tarifaZonaEtapaService;

    @GetMapping("/proyecto/{idProyecto}")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<TarifaZonaEtapaResponse>> listarPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                tarifaZonaEtapaService.listarPorProyecto(idProyecto)
        );
    }

    @GetMapping("/proyecto/{idProyecto}/activas")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<TarifaZonaEtapaResponse>> listarActivasPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                tarifaZonaEtapaService.listarActivasPorProyecto(idProyecto)
        );
    }

    @GetMapping("/{idTarifa}")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<TarifaZonaEtapaResponse> obtenerPorId(
            @PathVariable Long idTarifa
    ) {
        return ResponseEntity.ok(
                tarifaZonaEtapaService.obtenerPorId(idTarifa)
        );
    }

    @PostMapping
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<TarifaZonaEtapaResponse> registrar(
            @Valid @RequestBody TarifaZonaEtapaRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(tarifaZonaEtapaService.registrar(request));
    }

    @DeleteMapping("/{idTarifa}")
    @PreAuthorize("hasAuthority('projects.edit')")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long idTarifa
    ) {
        tarifaZonaEtapaService.desactivar(idTarifa);
        return ResponseEntity.noContent().build();
    }
}
