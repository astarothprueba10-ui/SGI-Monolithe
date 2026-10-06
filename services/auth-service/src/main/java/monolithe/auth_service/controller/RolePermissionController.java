package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.CreateRoleRequest;
import monolithe.auth_service.dto.UpdateRolePermissionsRequest;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.RolePermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/security/roles")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService service;

    @PostMapping
    @PreAuthorize("hasAuthority('roles.create')")
    public ResponseEntity<SecurityOperationResult> crearRol(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateRoleRequest request) {

        SecurityOperationResult resultado = service.crearRol(
                Long.valueOf(jwt.getSubject()),
                request.getNombre()
        );

        return switch (resultado.estado()) {
            case "CREADO" ->
                    ResponseEntity.status(HttpStatus.CREATED).body(resultado);

            case "DENEGADO" ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultado);

            case "ROL_EXISTENTE" ->
                    ResponseEntity.status(HttpStatus.CONFLICT).body(resultado);

            default ->
                    ResponseEntity.badRequest().body(resultado);
        };
    }

    @PutMapping("/{codigoRol}/permissions")
    @PreAuthorize("hasAuthority('roles.assign_permissions')")
    public ResponseEntity<SecurityOperationResult> actualizarPermisos(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String codigoRol,
            @RequestBody UpdateRolePermissionsRequest request) {

        SecurityOperationResult resultado = service.actualizarPermisos(
                Long.valueOf(jwt.getSubject()),
                codigoRol,
                request.permisos()
        );

        return switch (resultado.estado()) {
            case "OK" ->
                    ResponseEntity.ok(resultado);

            case "DENEGADO", "PROTEGIDO" ->
                    ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultado);

            case "NO_ENCONTRADO" ->
                    ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultado);

            default ->
                    ResponseEntity.badRequest().body(resultado);
        };
    }
}