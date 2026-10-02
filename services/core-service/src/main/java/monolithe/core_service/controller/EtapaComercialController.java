package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.EtapaComercialRequest;
import monolithe.core_service.dto.EtapaComercialResponse;
import monolithe.core_service.service.EtapaComercialService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/etapas-comerciales")
@RequiredArgsConstructor
public class EtapaComercialController {

    private final EtapaComercialService etapaComercialService;

    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<List<EtapaComercialResponse>> listarPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                etapaComercialService.listarPorProyecto(idProyecto)
        );
    }

    @GetMapping("/proyecto/{idProyecto}/activas")
    public ResponseEntity<List<EtapaComercialResponse>> listarActivasPorProyecto(
            @PathVariable Long idProyecto
    ) {
        return ResponseEntity.ok(
                etapaComercialService.listarActivasPorProyecto(idProyecto)
        );
    }

    @GetMapping("/{idEtapaComercial}")
    public ResponseEntity<EtapaComercialResponse> obtenerPorId(
            @PathVariable Long idEtapaComercial
    ) {
        return ResponseEntity.ok(
                etapaComercialService.obtenerPorId(idEtapaComercial)
        );
    }

    @PostMapping
    public ResponseEntity<EtapaComercialResponse> crear(
            @Valid @RequestBody EtapaComercialRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(etapaComercialService.crear(request));
    }

    @PutMapping("/{idEtapaComercial}")
    public ResponseEntity<EtapaComercialResponse> actualizar(
            @PathVariable Long idEtapaComercial,
            @Valid @RequestBody EtapaComercialRequest request
    ) {
        return ResponseEntity.ok(
                etapaComercialService.actualizar(idEtapaComercial, request)
        );
    }

    @DeleteMapping("/{idEtapaComercial}")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long idEtapaComercial
    ) {
        etapaComercialService.desactivar(idEtapaComercial);
        return ResponseEntity.noContent().build();
    }
}
