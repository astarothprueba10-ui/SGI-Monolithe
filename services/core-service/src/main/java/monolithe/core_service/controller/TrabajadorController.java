
package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.TrabajadorResponse;
import monolithe.core_service.service.TrabajadorService;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;

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
