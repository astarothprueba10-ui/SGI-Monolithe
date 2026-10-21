package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.UbicacionGeograficaResponse;
import monolithe.core_service.service.UbicacionGeograficaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/core/ubicaciones")
@RequiredArgsConstructor
public class UbicacionGeograficaController {

    private final UbicacionGeograficaService ubicacionGeograficaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<UbicacionGeograficaResponse>> listarUbicaciones(
            @RequestParam(value = "padreId", required = false) Long padreId) {

        List<UbicacionGeograficaResponse> ubicaciones =
                ubicacionGeograficaService.listarUbicaciones(padreId);

        return ResponseEntity.ok(ubicaciones);
    }
}
