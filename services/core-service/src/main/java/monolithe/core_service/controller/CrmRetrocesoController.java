package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ResolverRetrocesoCrmRequest;
import monolithe.core_service.dto.SolicitarRetrocesoCrmRequest;
import monolithe.core_service.service.CrmRetrocesoService;
import org.springframework.format.annotation.DateTimeFormat;
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

import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
public class CrmRetrocesoController {

    private final CrmRetrocesoService service;

    @PostMapping("/prospectos/{idProspecto}/retrocesos")
    @PreAuthorize("hasAuthority('crm.edit') or hasAuthority('ROLE_ASESOR')")
    public ResponseEntity<JsonNode> solicitarRetroceso(
            @PathVariable Long idProspecto,
            @Valid @RequestBody SolicitarRetrocesoCrmRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        JsonNode resultado = service.solicitarRetroceso(idActor(jwt), idProspecto, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(resultado);
    }

    @PostMapping(value = "/retrocesos/{idSolicitud}/evidencia", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('crm.edit') or hasAuthority('ROLE_ASESOR')")
    public ResponseEntity<JsonNode> adjuntarEvidencia(
            @PathVariable Long idSolicitud,
            @RequestParam("archivo") MultipartFile archivo,
            @AuthenticationPrincipal Jwt jwt) {
        JsonNode resultado = service.adjuntarEvidencia(idActor(jwt), idSolicitud, archivo);
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/retrocesos/{idSolicitud}/evidencia/url-firmada")
    @PreAuthorize("hasAuthority('crm.view') or hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR', 'ROLE_ASESOR')")
    public JsonNode obtenerUrlEvidencia(
            @PathVariable Long idSolicitud,
            @AuthenticationPrincipal Jwt jwt) {
        return service.generarUrlFirmada(idActor(jwt), idSolicitud);
    }

    @GetMapping("/prospectos/{idProspecto}/retrocesos/pendiente")
    @PreAuthorize("hasAuthority('crm.view') or hasAuthority('crm.edit') or hasAnyAuthority('ROLE_ASESOR', 'ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode miRetrocesoPendiente(
            @PathVariable Long idProspecto,
            @AuthenticationPrincipal Jwt jwt) {
        return service.miRetrocesoPendiente(idActor(jwt), idProspecto);
    }

    @GetMapping("/retrocesos")
    @PreAuthorize("hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode listarSolicitudes(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hastaExclusivo,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busqueda,
            @RequestParam(defaultValue = "1") Integer pagina,
            @RequestParam(defaultValue = "15") Integer tamano,
            @RequestParam(required = false) Long asesor,
            @AuthenticationPrincipal Jwt jwt) {
        return service.listarSolicitudes(idActor(jwt), desde, hastaExclusivo, estado, busqueda, pagina, tamano, asesor);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode listarSolicitudes(
            OffsetDateTime desde,
            OffsetDateTime hastaExclusivo,
            String estado,
            String busqueda,
            Integer pagina,
            Integer tamano,
            Jwt jwt) {
        return listarSolicitudes(desde, hastaExclusivo, estado, busqueda, pagina, tamano, null, jwt);
    }

    @GetMapping("/retrocesos/indicadores")
    @PreAuthorize("hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode obtenerIndicadores(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime hastaExclusivo,
            @RequestParam(required = false) Long asesor,
            @AuthenticationPrincipal Jwt jwt) {
        return service.obtenerIndicadores(idActor(jwt), desde, hastaExclusivo, asesor);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode obtenerIndicadores(
            OffsetDateTime desde,
            OffsetDateTime hastaExclusivo,
            Jwt jwt) {
        return obtenerIndicadores(desde, hastaExclusivo, null, jwt);
    }

    @GetMapping("/retrocesos/motivos")
    @PreAuthorize("hasAuthority('crm.view') or hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR', 'ROLE_ASESOR')")
    public JsonNode catalogoMotivos(@AuthenticationPrincipal Jwt jwt) {
        return service.catalogoMotivos(idActor(jwt));
    }

    @PutMapping("/retrocesos/{idSolicitud}/decision")
    @PreAuthorize("hasAnyAuthority('ROLE_GERENCIA', 'ROLE_SUPERVISOR_COMERCIAL', 'ROLE_ADMINISTRADOR')")
    public JsonNode resolverRetroceso(
            @PathVariable Long idSolicitud,
            @Valid @RequestBody ResolverRetrocesoCrmRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return service.resolverRetroceso(idActor(jwt), idSolicitud, request);
    }

    private Long idActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No existe una identidad valida en el JWT.");
        }
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id <= 0) {
                throw new NumberFormatException();
            }
            return id;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de JWT invalida.");
        }
    }
}
