package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.PlanoSvgProyectoRequest;
import monolithe.core_service.dto.PlanoSvgProyectoResponse;
import monolithe.core_service.service.PlanoSvgProyectoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/core/planos/proyecto/{idProyecto}/svg")
@RequiredArgsConstructor
public class PlanoSvgProyectoController {
    private final PlanoSvgProyectoService service;

    @GetMapping
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<PlanoSvgProyectoResponse> obtener(@PathVariable Long idProyecto) {
        var documento = service.obtener(idProyecto);
        return documento==null ? ResponseEntity.noContent().build() : ResponseEntity.ok(documento);
    }

    @PutMapping("/asociaciones")
    @PreAuthorize("hasAuthority('lots.configure')")
    public PlanoSvgProyectoService.ResultadoAsociaciones guardarAsociaciones(@PathVariable Long idProyecto,
        @Valid @RequestBody PlanoSvgProyectoService.CambiosAsociaciones request) {
        return service.guardarAsociaciones(idProyecto,request);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('lots.configure')")
    public PlanoSvgProyectoResponse guardar(@PathVariable Long idProyecto,
        @Valid @RequestBody PlanoSvgProyectoRequest request) {
        return service.guardar(idProyecto,request);
    }
}
