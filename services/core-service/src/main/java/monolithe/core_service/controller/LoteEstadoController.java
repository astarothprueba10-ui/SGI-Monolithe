package monolithe.core_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.CambiarEstadoLoteRequest;
import monolithe.core_service.dto.CambioEstadoLoteResponse;
import monolithe.core_service.dto.LoteHistorialEstadoResponse;
import monolithe.core_service.service.LoteEstadoService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/lotes")
@RequiredArgsConstructor
@Validated
public class LoteEstadoController {

    private final LoteEstadoService loteEstadoService;

    @PatchMapping("/{idLote}/estado")
    public ResponseEntity<CambioEstadoLoteResponse> cambiarEstado(
            @PathVariable @Positive Long idLote,
            @Valid @RequestBody CambiarEstadoLoteRequest request
    ) {
        return ResponseEntity.ok(
                loteEstadoService.cambiarEstado(idLote, request)
        );
    }

    @GetMapping("/{idLote}/historial-estados")
    public ResponseEntity<List<LoteHistorialEstadoResponse>> listarHistorial(
            @PathVariable @Positive Long idLote
    ) {
        return ResponseEntity.ok(
                loteEstadoService.listarHistorial(idLote)
        );
    }
}