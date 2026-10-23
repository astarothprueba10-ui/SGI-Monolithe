package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.CreateRoleRequest;
import monolithe.auth_service.dto.UpdateRoleRequest;
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('roles.create')")
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
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('roles.assign_permissions')")
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

    /** Actualiza únicamente el nombre y la descripción del rol identificado por su código. */
    @PutMapping("/{codigoRol}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('roles.edit')")
    public ResponseEntity<SecurityOperationResult> actualizarRol(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String codigoRol,
            @Valid @RequestBody UpdateRoleRequest request) {
        return respuestaOperacion(service.actualizarRol(
                Long.valueOf(jwt.getSubject()), codigoRol, request.nombre(), request.descripcion()));
    }

    /** Desactiva un rol si su política y sus asignaciones activas lo permiten. */
    @PatchMapping("/{codigoRol}/deactivate")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('roles.deactivate')")
    public ResponseEntity<SecurityOperationResult> desactivarRol(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String codigoRol) {
        return respuestaOperacion(service.desactivarRol(Long.valueOf(jwt.getSubject()), codigoRol));
    }

    /** Reactiva un rol con autorización explícita y renovación de sesiones afectadas. */
    @PatchMapping("/{codigoRol}/activate")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('roles.activate')")
    public ResponseEntity<SecurityOperationResult> reactivarRol(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String codigoRol) {
        return respuestaOperacion(service.reactivarRol(Long.valueOf(jwt.getSubject()), codigoRol));
    }

    private ResponseEntity<SecurityOperationResult> respuestaOperacion(SecurityOperationResult resultado) {
        return switch (resultado.estado()) {
            case "OK", "ACTUALIZADO", "DESACTIVADO", "REACTIVADO" -> ResponseEntity.ok(resultado);
            case "DENEGADO", "PROTEGIDO" -> ResponseEntity.status(HttpStatus.FORBIDDEN).body(resultado);
            case "NO_ENCONTRADO" -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(resultado);
            case "ROL_EXISTENTE", "ASIGNACIONES_ACTIVAS", "YA_ACTIVO", "YA_INACTIVO" -> ResponseEntity.status(HttpStatus.CONFLICT).body(resultado);
            default -> ResponseEntity.badRequest().body(resultado);
        };
    }
}
