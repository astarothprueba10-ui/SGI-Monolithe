package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.CatalogoResponse;
import monolithe.core_service.dto.EstadoLoteResponse;
import monolithe.core_service.dto.MonedaResponse;
import monolithe.core_service.service.CatalogoService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/core/catalogos")
@RequiredArgsConstructor
public class CatalogoController {

    private final CatalogoService catalogoService;

    @GetMapping("/estados-proyecto")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<CatalogoResponse>> listarEstadosProyecto() {
        return ResponseEntity.ok(catalogoService.listarEstadosProyecto());
    }

    @GetMapping("/estados-etapa")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<CatalogoResponse>> listarEstadosEtapa() {
        return ResponseEntity.ok(catalogoService.listarEstadosEtapa());
    }

    @GetMapping("/estados-manzana")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<CatalogoResponse>> listarEstadosManzana() {
        return ResponseEntity.ok(catalogoService.listarEstadosManzana());
    }

    @GetMapping("/estados-lote")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<EstadoLoteResponse>> listarEstadosLote() {
        return ResponseEntity.ok(catalogoService.listarEstadosLote());
    }

    @GetMapping("/tipos-lote")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<CatalogoResponse>> listarTiposLote() {
        return ResponseEntity.ok(catalogoService.listarTiposLote());
    }

    @GetMapping("/monedas")
    @PreAuthorize("hasAuthority('lots.view')")
    public ResponseEntity<List<MonedaResponse>> listarMonedas() {
        return ResponseEntity.ok(catalogoService.listarMonedas());
    }

    @GetMapping("/tipos-tarifa")
    @PreAuthorize("hasAuthority('projects.view')")
    public ResponseEntity<List<CatalogoResponse>> listarTiposTarifa() {
        return ResponseEntity.ok(catalogoService.listarTiposTarifa());
    }

    @GetMapping("/tipos-ajuste-precio")
    @PreAuthorize("hasAnyAuthority('projects.view', 'lots.view')")
    public ResponseEntity<List<CatalogoResponse>> listarTiposAjustePrecio() {
        return ResponseEntity.ok(catalogoService.listarTiposAjustePrecio());
    }
}
