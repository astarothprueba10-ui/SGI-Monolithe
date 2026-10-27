package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.CrmConsultaService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm")
@RequiredArgsConstructor
public class CrmConsultaController {

    private final CrmConsultaService servicio;

    @GetMapping("/prospectos")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode listarProspectos(@AuthenticationPrincipal Jwt jwt) {
        return servicio.listarProspectos(obtenerIdActor(jwt));
    }

    @GetMapping("/asesores")
    @PreAuthorize("hasAuthority('crm.view')")
    public JsonNode listarAsesores(@AuthenticationPrincipal Jwt jwt) {
        return servicio.listarAsesores(obtenerIdActor(jwt));
    }

    private Long obtenerIdActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "No se pudo identificar al usuario autenticado.");
        }
        try {
            long idActor = Long.parseLong(jwt.getSubject());
            if (idActor <= 0) {
                throw new NumberFormatException("Id no positivo");
            }
            return idActor;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "La identidad del JWT no es valida.");
        }
    }
}
