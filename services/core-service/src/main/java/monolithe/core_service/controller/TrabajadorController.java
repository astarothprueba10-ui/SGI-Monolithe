
package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.*;
import monolithe.core_service.service.TrabajadorService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import tools.jackson.databind.JsonNode;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/core/trabajadores")
@RequiredArgsConstructor
public class TrabajadorController {

    private final TrabajadorService trabajadorService;

    @GetMapping
    @PreAuthorize("hasAuthority('hr.view')")
    public List<TrabajadorResponse> listarTrabajadores(
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.listarTodos(idActor);
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAuthority('hr.view')")
    public ResponseEntity<JsonNode> listarHistorialLaboral(
            @RequestParam(required = false) Long idTrabajador,
            @RequestParam(required = false) String tipoEvento,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(trabajadorService.listarHistorialLaboral(
                idActor,
                idTrabajador,
                tipoEvento,
                fechaDesde,
                fechaHasta));
    }

    @GetMapping("/metricas")
    @PreAuthorize("hasAuthority('hr.view')")
    public ResponseEntity<JsonNode> obtenerMetricasTrabajadores(
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(trabajadorService.obtenerMetricasTrabajadores(idActor));
    }

    @GetMapping("/catalogos")
    @PreAuthorize("hasAnyAuthority('hr.view', 'hr.create')")
    public JsonNode obtenerCatalogos(
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.obtenerCatalogos(idActor);
    }

    @GetMapping("/{idTrabajador}")
    @PreAuthorize("hasAuthority('hr.view')")
    public TrabajadorResponse obtenerTrabajador(
            @PathVariable Long idTrabajador,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.obtenerPorId(
                idActor,
                idTrabajador);
    }

    @PostMapping("/identificar-persona")
    @PreAuthorize("hasAuthority('hr.create')")
    public JsonNode identificarPersona(
            @RequestBody JsonNode datos,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.identificarPersona(
                idActor,
                datos);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('hr.create')")
    public JsonNode registrarTrabajador(
            @RequestBody JsonNode datos,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.registrarTrabajador(
                idActor,
                datos);
    }

    @PutMapping("/{idTrabajador}")
    @PreAuthorize("hasAuthority('hr.edit')")
    public JsonNode actualizarTrabajador(
            @PathVariable Long idTrabajador,
            @RequestBody JsonNode solicitud,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return trabajadorService.actualizarTrabajador(
                idActor,
                idTrabajador,
                solicitud);
    }

    @PostMapping("/{idTrabajador}/solicitar-cambio-correo")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<SolicitudCambioCorreoResponse> solicitarCambioCorreo(
            @PathVariable Long idTrabajador,
            @RequestBody @Valid SolicitudCambioCorreoRequest solicitud,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);
        String tokenJwt = jwt.getTokenValue();

        return ResponseEntity.ok(trabajadorService.solicitarCambioCorreo(
                idActor,
                idTrabajador,
                solicitud.correoNuevo(),
                tokenJwt));
    }

    @PostMapping("/confirmar-cambio-correo")
    public ResponseEntity<ConfirmacionCambioCorreoResponse> confirmarCambioCorreo(
            @RequestBody @Valid ConfirmarCambioCorreoRequest solicitud) {

        return ResponseEntity.ok(trabajadorService.confirmarCambioCorreo(
                solicitud.token()));
    }

    @PostMapping("/{idTrabajador}/suspensiones")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<JsonNode> programarSuspension(
            @PathVariable Long idTrabajador,
            @RequestBody @Valid ProgramarSuspensionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(trabajadorService.programarSuspension(
                idActor,
                idTrabajador,
                request));
    }

    @PostMapping("/{idTrabajador}/cesar")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<JsonNode> cesarTrabajador(
            @PathVariable Long idTrabajador,
            @RequestBody @Valid CesarTrabajadorRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.ok(trabajadorService.cesarTrabajador(
                idActor,
                idTrabajador,
                request));
    }

    @PostMapping("/{idTrabajador}/reincorporaciones")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<JsonNode> solicitarReincorporacion(
            @PathVariable Long idTrabajador,
            @RequestBody @Valid SolicitarReincorporacionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Long idActor = obtenerIdActor(jwt);

        return ResponseEntity.status(HttpStatus.CREATED).body(
                trabajadorService.solicitarReincorporacion(
                        idActor,
                        idTrabajador,
                        request));
    }

    private Long obtenerIdActor(Jwt jwt) {

        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario autenticado.");
        }

        try {
            Long idActor = Long.valueOf(jwt.getSubject());

            if (idActor <= 0) {
                throw new NumberFormatException(
                        "Identificador de usuario inválido.");
            }

            return idActor;

        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "El identificador del usuario es inválido.");
        }
    }
}
