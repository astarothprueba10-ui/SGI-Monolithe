package monolithe.auth_service.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.CreateUserRequest;
import monolithe.auth_service.dto.CreatedUserResponse;
import monolithe.auth_service.dto.UpdateUserRequest;
import monolithe.auth_service.dto.UserOperationResponse;
import monolithe.auth_service.dto.UserRoleRequest;
import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.UserManagementService;

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

        @PostMapping
        @PreAuthorize("hasAuthority('users.create')")
        public ResponseEntity<CreatedUserResponse> crearUsuario(
                        @Valid @RequestBody CreateUserRequest request,
                        @AuthenticationPrincipal Jwt jwt) {

                Long idActor = Long.valueOf(jwt.getSubject());

                CreatedUserResult resultado = userManagementService.crearUsuario(
                                idActor,
                                request.getIdPersona(),
                                request.getUsuarioLogin());

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
                                        "CONFLICTO" ->
                                ResponseEntity
                                                .status(HttpStatus.CONFLICT)
                                                .body(response);

                        case "DENEGADO" ->
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
        @PreAuthorize("hasAuthority('users.activate')")
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
        @PreAuthorize("hasAuthority('users.deactivate')")
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
        @PreAuthorize("hasAuthority('users.assign_role')")
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
        @PreAuthorize("hasAuthority('users.assign_role')")
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
        @PreAuthorize("hasAuthority('users.assign_role')")
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
        @PreAuthorize("hasAuthority('users.edit')")
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