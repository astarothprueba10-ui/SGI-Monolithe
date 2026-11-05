package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ActualizarPrecioManualRequest;
import monolithe.core_service.dto.LotePrecioRequest;
import monolithe.core_service.dto.LotePrecioResponse;
import monolithe.core_service.dto.LotePrecioVigenteResponse;
import monolithe.core_service.service.LotePrecioService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/lotes-precios")
@RequiredArgsConstructor
public class LotePrecioController {

    private final LotePrecioService lotePrecioService;

    @GetMapping("/lote/{idLote}/historial")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<LotePrecioResponse>> listarHistorial(
            @PathVariable Long idLote
    ) {
        return ResponseEntity.ok(
                lotePrecioService.listarHistorial(idLote)
        );
    }

    @GetMapping("/lote/{idLote}/vigente")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<LotePrecioResponse> obtenerVigente(
            @PathVariable Long idLote,
            @RequestParam("moneda") String codigoMoneda
    ) {
        return ResponseEntity.ok(
                lotePrecioService.obtenerVigente(idLote, codigoMoneda)
        );
    }

    @GetMapping("/proyecto/{idProyecto}/vigentes")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<LotePrecioVigenteResponse>> listarVigentesPorProyecto(
            @PathVariable Long idProyecto,
            @RequestParam(value = "moneda", defaultValue = "PEN") String codigoMoneda
    ) {
        return ResponseEntity.ok(
                lotePrecioService.listarVigentesPorProyecto(idProyecto, codigoMoneda)
        );
    }

    @PutMapping("/lote/{idLote}/manual")
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('lots.edit')")
    public ResponseEntity<LotePrecioResponse> actualizarPrecioManual(
            @PathVariable Long idLote,
            @Valid @RequestBody ActualizarPrecioManualRequest request
    ) {
        return ResponseEntity.ok(
                lotePrecioService.actualizarPrecioManual(idLote, request)
        );
    }

    @PostMapping("/calcular")
    @PreAuthorize("hasAuthority('lots.edit')")
    public ResponseEntity<LotePrecioResponse> calcularYRegistrar(
            @Valid @RequestBody LotePrecioRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(lotePrecioService.calcularYRegistrar(request));
    }
}
