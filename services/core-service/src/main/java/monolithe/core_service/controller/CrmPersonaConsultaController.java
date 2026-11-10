package monolithe.core_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConsultaPersonaCrmRequest;
import monolithe.core_service.dto.ConsultaPersonaCrmResponse;
import monolithe.core_service.service.CrmPersonaConsultaService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Consulta autenticada de nombres para el registro de leads. */
@RestController
@RequestMapping("/api/core/crm/personas")
@RequiredArgsConstructor
public class CrmPersonaConsultaController {
    private final CrmPersonaConsultaService service;

    /** Consulta sin almacenar el documento en la URL ni permitir caché de la respuesta. */
    @PostMapping("/consultar")
    @PreAuthorize("hasAuthority('crm.create')")
    public ResponseEntity<ConsultaPersonaCrmResponse> consultar(@Valid @RequestBody ConsultaPersonaCrmRequest request,
                                                              @AuthenticationPrincipal Jwt jwt) {
        validarActor(jwt);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.consultar(request));
    }

    private void validarActor(Jwt jwt) {
        try {
            if (jwt == null || jwt.getSubject() == null || Long.parseLong(jwt.getSubject()) <= 0)
                throw new NumberFormatException("Actor inválido");
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La identidad del usuario no es válida.");
        }
    }
}
