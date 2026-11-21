package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConfiguracionProyectoRequest;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.service.ConfiguracionProyectoService;
import monolithe.core_service.service.SimulacionComercialService;
import monolithe.core_service.dto.SimulacionComercialResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/core/proyectos/{idProyecto}/configuracion-comercial")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit')")
public class ConfiguracionProyectoController {
    private final ConfiguracionProyectoService service;
    private final SimulacionComercialService simulacion;

    @GetMapping
    public ConfiguracionProyectoResponse obtener(@PathVariable Long idProyecto) {
        return service.obtener(idProyecto);
    }

    @PutMapping
    public ConfiguracionProyectoResponse guardar(@PathVariable Long idProyecto,
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ConfiguracionProyectoRequest request) {
        return service.guardar(idProyecto, obtenerActor(jwt), request);
    }

    @GetMapping("/simulacion")
    public SimulacionComercialResponse simular(@PathVariable Long idProyecto,
            @RequestParam Long idLote, @RequestParam int version, @RequestParam(defaultValue = "PEN") String moneda) {
        return simulacion.simular(idProyecto, idLote, version, moneda);
    }

    private Long obtenerActor(Jwt jwt) {
        try {
            Long id = Long.valueOf(jwt.getSubject());
            if (id > 0) return id;
        } catch (RuntimeException ignored) {
            // La identidad debe proceder exclusivamente del JWT autenticado.
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de usuario inválida.");
    }
}
