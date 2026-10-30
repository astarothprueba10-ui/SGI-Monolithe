package monolithe.core_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.service.CrmComisionesService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/core/crm/comisiones")
@RequiredArgsConstructor
public class CrmComisionesController {

    private final CrmComisionesService servicio;

    @GetMapping
    @PreAuthorize("hasAuthority('advisors.view')")
    public JsonNode listar(@AuthenticationPrincipal Jwt jwt) {
        return servicio.listarOperativas(idActor(jwt));
    }

    @PostMapping("/{idComision}/aprobar")
    @PreAuthorize("hasAuthority('advisors.approve')")
    public JsonNode aprobar(@PathVariable Long idComision, @AuthenticationPrincipal Jwt jwt) {
        return servicio.aprobarDevengo(idActor(jwt), idComision);
    }

    private Long idActor(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        }
        try {
            long id = Long.parseLong(jwt.getSubject());
            if (id <= 0) throw new NumberFormatException("ID no positivo");
            return id;
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identidad de usuario invalida.");
        }
    }
}
