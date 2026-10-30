package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ResolverCorreccionRequest;
import monolithe.core_service.service.EvidenciaCorreccionService;
import monolithe.core_service.service.TrabajadorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.util.Map;

@RestController
@RequestMapping("/api/core/correcciones-documento")
@RequiredArgsConstructor
public class CorreccionDocumentalController {

    private final TrabajadorService trabajadorService;
    private final EvidenciaCorreccionService evidenciaService;

    @PostMapping("/trabajadores/{idTrabajador}")
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<JsonNode> solicitarCorreccion(
            @PathVariable Long idTrabajador,
            @RequestBody JsonNode datos,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                trabajadorService.solicitarCorreccionDocumento(
                        idActor, idTrabajador, datos));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<JsonNode> listarPendientes(
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        return ResponseEntity.ok(
                trabajadorService.listarSolicitudesCorreccion(idActor));
    }

    @GetMapping("/{idSolicitud}")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<JsonNode> obtenerDetalle(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        return ResponseEntity.ok(
                trabajadorService.obtenerDetalleCorreccion(idActor, idSolicitud));
    }

    @PostMapping(value = "/{idSolicitud}/evidencia",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('hr.edit')")
    public ResponseEntity<JsonNode> adjuntarEvidencia(
            @PathVariable Long idSolicitud,
            @RequestPart("archivo") MultipartFile archivo,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                evidenciaService.adjuntarEvidencia(idActor, idSolicitud, archivo));
    }

    @GetMapping("/{idSolicitud}/evidencia/url-firmada")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<Map<String, String>> obtenerUrlFirmada(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        String url = evidenciaService.generarUrlFirmada(idActor, idSolicitud);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/{idSolicitud}/resolver")
    @PreAuthorize("hasAuthority('hr.approve')")
    public ResponseEntity<JsonNode> resolver(
            @PathVariable Long idSolicitud,
            @RequestBody @Valid ResolverCorreccionRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = obtenerIdActor(jwt);
        return ResponseEntity.ok(
                trabajadorService.resolverCorreccion(idActor, idSolicitud, request, jwt != null ? jwt.getTokenValue() : null));
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
                throw new NumberFormatException("Identificador de usuario invalido.");
            }
            return idActor;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "El identificador del usuario es invalido.");
        }
    }
}
