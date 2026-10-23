package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.CreateUserRequest;
import monolithe.auth_service.dto.CreatedUserResponse;
import monolithe.auth_service.dto.UpdateUserRequest;
import monolithe.auth_service.dto.UserOperationResponse;
import monolithe.auth_service.dto.UserRoleRequest;
import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.UserManagementService;
import monolithe.auth_service.service.AuditService;
import monolithe.auth_service.service.UserCreationException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/security/users")
@RequiredArgsConstructor
public class UserManagementController {

        private final UserManagementService userManagementService;
        private final AuditService auditService;

        @PostMapping
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.create') and hasAuthority('users.assign_role')")
        public ResponseEntity<CreatedUserResponse> crearUsuario(
                        @Valid @RequestBody CreateUserRequest request,
                        @AuthenticationPrincipal Jwt jwt,
                        HttpServletRequest httpRequest) {

                Long idActor = Long.valueOf(jwt.getSubject());

                CreatedUserResult resultado;
                boolean falloEnAsignacionAtomica = false;
                try {
                        resultado = userManagementService.crearUsuario(
                                        idActor,
                                        request.getIdPersona(),
                                        request.getUsuarioLogin(),
                                        request.getCodigosRol());
                } catch (UserCreationException error) {
                        resultado = new CreatedUserResult(null, error.getEstado(), error.getMessage());
                        falloEnAsignacionAtomica = true;
                }

                boolean falloValidacionAuth = switch (resultado.estado()) {
                        case "NO_ELEGIBLE",
                                        "DENEGADO",
                                        "RELACION_INVALIDA",
                                        "ROL_CLIENTE_OBLIGATORIO",
                                        "ROL_INTERNO_OBLIGATORIO",
                                        "ROL_NO_PERMITIDO",
                                        "CORREO_NO_DISPONIBLE",
                                        "ROL_NO_AUTORIZADO" -> true;
                        default -> false;
                };
                if (falloEnAsignacionAtomica || falloValidacionAuth) {
                        String resultadoAuditoria = "DENEGADO".equals(resultado.estado())
                                        || "ROL_PROTEGIDO".equals(resultado.estado())
                                        || "ROL_NO_AUTORIZADO".equals(resultado.estado())
                                        ? "DENEGADO"
                                        : "FALLIDO";
                        auditService.registrar(
                                        idActor,
                                        "CREAR_USUARIO",
                                        resultadoAuditoria,
                                        "Alta de cuenta para persona " + request.getIdPersona()
                                                        + "; roles solicitados: " + request.getCodigosRol()
                                                        + "; resultado: " + resultado.estado(),
                                        httpRequest.getRemoteAddr(),
                                        httpRequest.getHeader("User-Agent"),
                                        "POST",
                                        "/api/security/users");
                }

                CreatedUserResponse response = new CreatedUserResponse(
                                resultado.idUsuario(),
                                resultado.estado(),
                                resultado.mensaje());

                return switch (resultado.estado()) {

                        case "CREADO" ->
                                ResponseEntity
                                                .status(HttpStatus.CREATED)
                                                .body(response);

                        case "PERSONA_CON_USUARIO",
                                        "LOGIN_EXISTENTE",
                                        "CONFLICTO",
                                        "NO_ELEGIBLE",
                                        "RELACION_INVALIDA",
                                        "ROL_CLIENTE_OBLIGATORIO",
                                        "ROL_INTERNO_OBLIGATORIO",
                                        "ROL_NO_PERMITIDO",
                                        "CORREO_NO_DISPONIBLE" ->
                                ResponseEntity
                                                .status(HttpStatus.CONFLICT)
                                                .body(response);

                        case "DENEGADO",
                                        "ROL_PROTEGIDO",
                                        "ROL_NO_AUTORIZADO",
                                        "USUARIO_PROTEGIDO" ->
                                ResponseEntity
                                                .status(HttpStatus.FORBIDDEN)
                                                .body(response);

                        case "CONFIGURACION_INVALIDA",
                                        "PASSWORD_HASH_INVALIDO" ->
                                ResponseEntity
                                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                                .body(response);

                        default ->
                                ResponseEntity
                                                .badRequest()
                                                .body(response);
                };
        }

        @PatchMapping("/{idUsuario}/activate")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.activate')")
        public ResponseEntity<UserOperationResponse> activarUsuario(
                        @PathVariable Long idUsuario,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.activarUsuario(
                                idActor,
                                idUsuario);

                return construirRespuestaOperacion(
                                resultado);
        }

        @PatchMapping("/{idUsuario}/deactivate")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.deactivate')")
        public ResponseEntity<UserOperationResponse> desactivarUsuario(
                        @PathVariable Long idUsuario,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.desactivarUsuario(
                                idActor,
                                idUsuario);

                return construirRespuestaOperacion(
                                resultado);
        }

        @PostMapping("/{idUsuario}/roles")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.assign_role')")
        public ResponseEntity<UserOperationResponse> asignarRol(
                        @PathVariable Long idUsuario,
                        @Valid @RequestBody UserRoleRequest request,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.asignarRol(
                                idActor,
                                idUsuario,
                                request.getCodigoRol());

                return construirRespuestaOperacion(
                                resultado);
        }

        @PutMapping("/{idUsuario}/roles/{codigoRolActual}")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.assign_role')")
        public ResponseEntity<UserOperationResponse> reemplazarRol(
                        @PathVariable Long idUsuario,
                        @PathVariable String codigoRolActual,
                        @Valid @RequestBody UserRoleRequest request,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.reemplazarRol(
                                idActor,
                                idUsuario,
                                codigoRolActual.trim().toUpperCase(),
                                request.getCodigoRol());

                return construirRespuestaOperacion(resultado);
        }

        @DeleteMapping("/{idUsuario}/roles/{codigoRol}")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.assign_role')")
        public ResponseEntity<UserOperationResponse> revocarRol(
                        @PathVariable Long idUsuario,
                        @PathVariable String codigoRol,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.revocarRol(
                                idActor,
                                idUsuario,
                                codigoRol.trim().toUpperCase());

                return construirRespuestaOperacion(
                                resultado);
        }

        @PatchMapping("/{idUsuario}")
        @PreAuthorize("hasAnyAuthority('ROLE_ADMINISTRADOR','ROLE_GERENCIA') and hasAuthority('users.edit')")
        public ResponseEntity<UserOperationResponse> actualizarUsuario(
                        @PathVariable Long idUsuario,
                        @Valid @RequestBody UpdateUserRequest request,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                SecurityOperationResult resultado = userManagementService.actualizarUsuario(
                                idActor,
                                idUsuario,
                                request.getUsuarioLogin());

                return construirRespuestaOperacion(resultado);
        }

        private ResponseEntity<UserOperationResponse> construirRespuestaOperacion(
                        SecurityOperationResult resultado) {

                UserOperationResponse response = new UserOperationResponse(
                                resultado.estado(),
                                resultado.mensaje());

                return switch (resultado.estado()) {

                        case "ACTIVADO",
                                        "DESACTIVADO",
                                        "ASIGNADO",
                                        "REVOCADO",
                                        "ACTUALIZADO",
                                        "YA_ACTIVO",
                                        "YA_INACTIVO" ->
                                ResponseEntity.ok(response);

                        case "NO_ENCONTRADO",
                                        "USUARIO_NO_ENCONTRADO",
                                        "ROL_NO_ENCONTRADO",
                                        "ROL_NO_ASIGNADO" ->
                                ResponseEntity
                                                .status(HttpStatus.NOT_FOUND)
                                                .body(response);

                        case "DENEGADO",
                                        "USUARIO_PROTEGIDO",
                                        "ROL_PROTEGIDO" ->
                                ResponseEntity
                                                .status(HttpStatus.FORBIDDEN)
                                                .body(response);

                        case "SIN_ROL",
                                        "ULTIMO_ROL",
                                        "OPERACION_NO_PERMITIDA",
                                        "LOGIN_EXISTENTE" ->
                                ResponseEntity
                                                .status(HttpStatus.CONFLICT)
                                                .body(response);

                        case "CONFIGURACION_INVALIDA" ->
                                ResponseEntity
                                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                                .body(response);

                        default ->
                                ResponseEntity
                                                .badRequest()
                                                .body(response);
                };
        }
}
