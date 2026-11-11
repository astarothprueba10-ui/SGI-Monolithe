package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConsultaPersonaTrabajadorRequest;
import monolithe.core_service.dto.ConsultaPersonaTrabajadorResponse;
import monolithe.core_service.service.TrabajadorPersonaConsultaService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Consulta de identidad reservada al alta de trabajadores. */
@RestController
@RequestMapping("/api/core/trabajadores/personas")
@RequiredArgsConstructor
public class TrabajadorPersonaConsultaController {
    private final TrabajadorPersonaConsultaService service;

    /** Autoriza RRHH independientemente de los permisos del CRM y evita almacenar la respuesta en caché. */
    @PostMapping("/consultar")
    @PreAuthorize("hasAuthority('hr.create')")
    public ResponseEntity<ConsultaPersonaTrabajadorResponse> consultar(@Valid @RequestBody ConsultaPersonaTrabajadorRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consultar(actor(jwt), request));
    }

    private Long actor(Jwt jwt) {
        try {
            long actor = jwt == null ? 0 : Long.parseLong(jwt.getSubject());
            if (actor <= 0) throw new NumberFormatException("Actor inválido");
            return actor;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La identidad del usuario no es válida.");
        }
    }
}
