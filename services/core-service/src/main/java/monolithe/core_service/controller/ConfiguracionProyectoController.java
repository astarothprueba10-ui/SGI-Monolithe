package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConfiguracionProyectoRequest;
import monolithe.core_service.dto.GestionComercialDto.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.service.ConfiguracionProyectoService;
import monolithe.core_service.service.SimulacionComercialService;
import monolithe.core_service.service.PublicacionComercialService;
import monolithe.core_service.dto.PublicacionComercialRequest;
import monolithe.core_service.dto.PublicacionComercialResponse;
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
    private final PublicacionComercialService publicacion;

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

    @GetMapping("/publicacion")
    public java.util.Map<String,Integer> estadoPublicacion(@PathVariable Long idProyecto) {
        return java.util.Map.of("version",service.versionPublicada(idProyecto),
            "lotesRegistrados",service.contarLotesRegistrados(idProyecto),"importacionRealizada",service.importacionRealizada(idProyecto)?1:0);
    }

    @PostMapping("/publicacion/validar")
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
    public PublicacionComercialResponse revisarPublicacion(@PathVariable Long idProyecto,
            @Valid @RequestBody PublicacionComercialRequest request) {
        return publicacion.previsualizar(idProyecto,request);
    }

    @PostMapping("/publicacion")
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
    public PublicacionComercialResponse publicar(@PathVariable Long idProyecto,
            @AuthenticationPrincipal Jwt jwt,@Valid @RequestBody PublicacionComercialRequest request) {
        return publicacion.publicar(idProyecto,obtenerActor(jwt),request);
    }

    @GetMapping("/gestion")
    public Respuesta gestion(@PathVariable Long idProyecto) { return publicacion.gestion(idProyecto); }

    @GetMapping("/gestion/historial")
    public java.util.List<Evento> historial(@PathVariable Long idProyecto) { return publicacion.historial(idProyecto); }

    @PutMapping("/gestion/disponibilidad")
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
    public Respuesta disponibilidad(@PathVariable Long idProyecto,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Disponibilidad request) {
        return publicacion.guardarDisponibilidad(idProyecto,obtenerActor(jwt),request);
    }

    @PutMapping("/gestion/tarifa")
    @PreAuthorize("hasAuthority('ROLE_GERENCIA') and hasAuthority('projects.view') and hasAuthority('projects.edit') and hasAuthority('lots.edit')")
    public Respuesta tarifa(@PathVariable Long idProyecto,@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody CambioTarifa request) {
        return publicacion.guardarTarifa(idProyecto,obtenerActor(jwt),request);
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
