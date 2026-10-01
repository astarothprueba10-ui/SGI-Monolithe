package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteRequest;
import monolithe.core_service.dto.LoteResponse;
import monolithe.core_service.service.LoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/lotes")
@RequiredArgsConstructor
public class LoteController {

    private final LoteService loteService;

    @GetMapping("/manzana/{idManzana}")
    public ResponseEntity<List<LoteResponse>> listarPorManzana(@PathVariable Long idManzana) {
        return ResponseEntity.ok(loteService.listarPorManzana(idManzana));
    }

    @GetMapping("/manzana/{idManzana}/activos")
    public ResponseEntity<List<LoteResponse>> listarActivosPorManzana(@PathVariable Long idManzana) {
        return ResponseEntity.ok(loteService.listarActivosPorManzana(idManzana));
    }

    @GetMapping("/{idLote}")
    public ResponseEntity<LoteResponse> obtenerPorId(@PathVariable Long idLote) {
        return ResponseEntity.ok(loteService.obtenerPorId(idLote));
    }

    @PostMapping
    public ResponseEntity<LoteResponse> crear(@Valid @RequestBody LoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(loteService.crear(request));
    }

    @PutMapping("/{idLote}")
    public ResponseEntity<LoteResponse> actualizar(
            @PathVariable Long idLote,
            @Valid @RequestBody LoteRequest request
    ) {
        return ResponseEntity.ok(loteService.actualizar(idLote, request));
    }

    @DeleteMapping("/{idLote}")
    public ResponseEntity<Void> desactivar(@PathVariable Long idLote) {
        loteService.desactivar(idLote);
        return ResponseEntity.noContent().build();
    }
}
