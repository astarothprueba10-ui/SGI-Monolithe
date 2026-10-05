package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteRequest;
import monolithe.core_service.dto.LoteResponse;
import monolithe.core_service.service.LoteService;
import monolithe.core_service.dto.LoteFiltroRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/lotes")
@RequiredArgsConstructor
public class LoteController {

    private final LoteService loteService;

    @GetMapping("/manzana/{idManzana}")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<LoteResponse>> listarPorManzana(@PathVariable Long idManzana) {
        return ResponseEntity.ok(loteService.listarPorManzana(idManzana));
    }

    @GetMapping("/manzana/{idManzana}/activos")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<LoteResponse>> listarActivosPorManzana(@PathVariable Long idManzana) {
        return ResponseEntity.ok(loteService.listarActivosPorManzana(idManzana));
    }

    @GetMapping("/buscar")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<LoteResponse>> buscar(
            @Valid @ModelAttribute LoteFiltroRequest filtro) {
        return ResponseEntity.ok(loteService.buscar(filtro));
    }

    @GetMapping("/{idLote}")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<LoteResponse> obtenerPorId(@PathVariable Long idLote) {
        return ResponseEntity.ok(loteService.obtenerPorId(idLote));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('lots.edit')")
    public ResponseEntity<LoteResponse> crear(@Valid @RequestBody LoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(loteService.crear(request));
    }

    @PutMapping("/{idLote}")
    @PreAuthorize("hasAuthority('lots.edit')")
    public ResponseEntity<LoteResponse> actualizar(
            @PathVariable Long idLote,
            @Valid @RequestBody LoteRequest request) {
        return ResponseEntity.ok(loteService.actualizar(idLote, request));
    }

    @DeleteMapping("/{idLote}")
    @PreAuthorize("hasAuthority('lots.edit')")
    public ResponseEntity<Void> desactivar(@PathVariable Long idLote) {
        loteService.desactivar(idLote);
        return ResponseEntity.noContent().build();
    }
}
