package monolithe.auth_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.AssociateEmailRequest;
import monolithe.auth_service.dto.UserOperationResponse;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.SecurityQueryService;
import monolithe.auth_service.service.UserManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
public class SecurityQueryController {

    private final SecurityQueryService service;
    private final UserManagementService userManagementService;

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('users.view')")
    public ResponseEntity<JsonNode> listarUsuarios(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarUsuarios(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyAuthority('roles.view','users.assign_role')")
    public ResponseEntity<JsonNode> listarRoles(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarRoles(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/roles/{codigoRol}/permissions")
    @PreAuthorize("hasAuthority('permissions.view')")
    public ResponseEntity<JsonNode> listarPermisos(@AuthenticationPrincipal Jwt jwt, @PathVariable String codigoRol) {
        return ResponseEntity.ok(service.listarPermisosRol(Long.valueOf(jwt.getSubject()), codigoRol));
    }

    @GetMapping("/people/available")
    @PreAuthorize("hasAuthority('users.create')")
    public ResponseEntity<JsonNode> listarPersonas(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarPersonasSinUsuario(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<JsonNode> listarAuditoria(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarAuditoria(Long.valueOf(jwt.getSubject())));
    }

    @PostMapping("/people/{idPersona}/email")
    @PreAuthorize("hasAuthority('users.create')")
    public ResponseEntity<UserOperationResponse> asociarCorreoPersona(
            @PathVariable Long idPersona,
            @Valid @RequestBody AssociateEmailRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        Long idActor = Long.valueOf(jwt.getSubject());

        SecurityOperationResult resultado =
                userManagementService.asociarCorreoPersona(
                        idActor,
                        idPersona,
                        request.getCorreo());

        UserOperationResponse response =
                new UserOperationResponse(resultado.estado(), resultado.mensaje());

        return "OK".equals(resultado.estado())
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }
}