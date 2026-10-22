package monolithe.auth_service.controller;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.service.SecurityQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/security")
@RequiredArgsConstructor
public class SecurityQueryController {

    private final SecurityQueryService service;

    @GetMapping("/users")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.view')")
    public ResponseEntity<JsonNode> listarUsuarios(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarUsuarios(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAnyAuthority('roles.view','users.assign_role')")
    public ResponseEntity<JsonNode> listarRoles(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarRoles(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/roles/{codigoRol}/permissions")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('permissions.view')")
    public ResponseEntity<JsonNode> listarPermisos(@AuthenticationPrincipal Jwt jwt, @PathVariable String codigoRol) {
        return ResponseEntity.ok(service.listarPermisosRol(Long.valueOf(jwt.getSubject()), codigoRol));
    }

    @GetMapping("/people/available")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.create') and hasAuthority('users.assign_role')")
    public ResponseEntity<JsonNode> listarPersonas(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarPersonasSinUsuario(Long.valueOf(jwt.getSubject())));
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAuthority('audit.view')")
    public ResponseEntity<JsonNode> listarAuditoria(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(service.listarAuditoria(Long.valueOf(jwt.getSubject())));
    }

}
