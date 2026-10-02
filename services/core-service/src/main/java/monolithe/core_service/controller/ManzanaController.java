package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ManzanaRequest;
import monolithe.core_service.dto.ManzanaResponse;
import monolithe.core_service.service.ManzanaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/manzanas")
@RequiredArgsConstructor
public class ManzanaController {

    private final ManzanaService manzanaService;

    @GetMapping("/etapa/{idEtapa}")
    public ResponseEntity<List<ManzanaResponse>> listarPorEtapa(@PathVariable Long idEtapa) {
        return ResponseEntity.ok(manzanaService.listarPorEtapa(idEtapa));
    }

    @GetMapping("/etapa/{idEtapa}/activas")
    public ResponseEntity<List<ManzanaResponse>> listarActivasPorEtapa(@PathVariable Long idEtapa) {
        return ResponseEntity.ok(manzanaService.listarActivasPorEtapa(idEtapa));
    }

    @GetMapping("/{idManzana}")
    public ResponseEntity<ManzanaResponse> obtenerPorId(@PathVariable Long idManzana) {
        return ResponseEntity.ok(manzanaService.obtenerPorId(idManzana));
    }

    @PostMapping
    public ResponseEntity<ManzanaResponse> crear(@Valid @RequestBody ManzanaRequest request) {
        ManzanaResponse creada = manzanaService.crear(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    @PutMapping("/{idManzana}")
    public ResponseEntity<ManzanaResponse> actualizar(
            @PathVariable Long idManzana,
            @Valid @RequestBody ManzanaRequest request
    ) {
        return ResponseEntity.ok(manzanaService.actualizar(idManzana, request));
    }

    @DeleteMapping("/{idManzana}")
    public ResponseEntity<Void> desactivar(@PathVariable Long idManzana) {
        manzanaService.desactivar(idManzana);
        return ResponseEntity.noContent().build();
    }
}
