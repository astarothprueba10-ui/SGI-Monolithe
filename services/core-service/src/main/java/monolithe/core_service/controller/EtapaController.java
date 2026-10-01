package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.EtapaRequest;
import monolithe.core_service.dto.EtapaResponse;
import monolithe.core_service.service.EtapaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/etapas")
@RequiredArgsConstructor
public class EtapaController {

    private final EtapaService etapaService;

    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<List<EtapaResponse>> listarPorProyecto(@PathVariable Long idProyecto) {
        return ResponseEntity.ok(etapaService.listarPorProyecto(idProyecto));
    }

    @GetMapping("/proyecto/{idProyecto}/activas")
    public ResponseEntity<List<EtapaResponse>> listarActivasPorProyecto(@PathVariable Long idProyecto) {
        return ResponseEntity.ok(etapaService.listarActivasPorProyecto(idProyecto));
    }

    @GetMapping("/{idEtapa}")
    public ResponseEntity<EtapaResponse> obtenerPorId(@PathVariable Long idEtapa) {
        return ResponseEntity.ok(etapaService.obtenerPorId(idEtapa));
    }

    @PostMapping
    public ResponseEntity<EtapaResponse> crear(@Valid @RequestBody EtapaRequest request) {
        EtapaResponse creada = etapaService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PutMapping("/{idEtapa}")
    public ResponseEntity<EtapaResponse> actualizar(
            @PathVariable Long idEtapa,
            @Valid @RequestBody EtapaRequest request) {
        return ResponseEntity.ok(
                etapaService.actualizar(idEtapa, request));
    }

    @DeleteMapping("/{idEtapa}")
    public ResponseEntity<Void> desactivar(@PathVariable Long idEtapa) {
        etapaService.desactivar(idEtapa);
        return ResponseEntity.noContent().build();
    }
}
