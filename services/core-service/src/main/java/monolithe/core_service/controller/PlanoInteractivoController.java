package monolithe.core_service.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.LoteGeometriaRequest;
import monolithe.core_service.dto.LoteGeometriaResponse;
import monolithe.core_service.dto.PlanoInteractivoDetalleResponse;
import monolithe.core_service.dto.PlanoInteractivoRequest;
import monolithe.core_service.dto.PlanoInteractivoResponse;
import monolithe.core_service.service.PlanoInteractivoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/core/planos")
@RequiredArgsConstructor
@Validated
public class PlanoInteractivoController {

    private final PlanoInteractivoService planoInteractivoService;

    @PostMapping
    public ResponseEntity<PlanoInteractivoResponse> crearVersion(
            @Valid @RequestBody PlanoInteractivoRequest request
    ) {
        PlanoInteractivoResponse response =
                planoInteractivoService.crearVersion(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/proyecto/{idProyecto}")
    public ResponseEntity<List<PlanoInteractivoResponse>> listarPorProyecto(
            @PathVariable @Positive Long idProyecto
    ) {
        return ResponseEntity.ok(
                planoInteractivoService.listarPorProyecto(idProyecto)
        );
    }

    @GetMapping("/proyecto/{idProyecto}/vigente")
    public ResponseEntity<PlanoInteractivoResponse> obtenerVigente(
            @PathVariable @Positive Long idProyecto,
            @RequestParam(required = false) @Positive Long idEtapa
    ) {
        return ResponseEntity.ok(
                planoInteractivoService.obtenerVigente(
                        idProyecto,
                        idEtapa
                )
        );
    }

    @GetMapping("/proyecto/{idProyecto}/detalle-vigente")
    public ResponseEntity<PlanoInteractivoDetalleResponse> obtenerDetalleVigente(
            @PathVariable @Positive Long idProyecto,
            @RequestParam(required = false) @Positive Long idEtapa
    ) {
        return ResponseEntity.ok(
                planoInteractivoService.obtenerDetalleVigente(
                        idProyecto,
                        idEtapa
                )
        );
    }

    @PutMapping("/geometrias")
    public ResponseEntity<LoteGeometriaResponse> guardarGeometria(
            @Valid @RequestBody LoteGeometriaRequest request
    ) {
        return ResponseEntity.ok(
                planoInteractivoService.guardarGeometria(request)
        );
    }

    @DeleteMapping("/geometrias/{idLoteGeometria}")
    public ResponseEntity<Void> desactivarGeometria(
            @PathVariable @Positive Long idLoteGeometria
    ) {
        planoInteractivoService.desactivarGeometria(idLoteGeometria);

        return ResponseEntity.noContent().build();
    }
}