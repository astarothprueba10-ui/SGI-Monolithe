package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.AjusteTipoLoteRequest;
import monolithe.core_service.dto.AjusteTipoLoteResponse;
import monolithe.core_service.service.AjusteTipoLoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/ajustes-tipo-lote")
@RequiredArgsConstructor
public class AjusteTipoLoteController {

    private final AjusteTipoLoteService ajusteTipoLoteService;

    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<List<AjusteTipoLoteResponse>> listarPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                ajusteTipoLoteService.listarPorProyecto(idProyecto)
        );
    }

    @GetMapping("/proyecto/{idProyecto}/activos")
    public ResponseEntity<List<AjusteTipoLoteResponse>> listarActivosPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                ajusteTipoLoteService.listarActivosPorProyecto(idProyecto)
        );
    }

    @GetMapping("/{idAjusteTipoLote}")
    public ResponseEntity<AjusteTipoLoteResponse> obtenerPorId(
            @PathVariable Long idAjusteTipoLote
    ) {
        return ResponseEntity.ok(
                ajusteTipoLoteService.obtenerPorId(idAjusteTipoLote)
        );
    }

    @PostMapping
    public ResponseEntity<AjusteTipoLoteResponse> registrar(
            @Valid @RequestBody AjusteTipoLoteRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ajusteTipoLoteService.registrar(request));
    }

    @DeleteMapping("/{idAjusteTipoLote}")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long idAjusteTipoLote
    ) {
        ajusteTipoLoteService.desactivar(idAjusteTipoLote);
        return ResponseEntity.noContent().build();
    }
}
