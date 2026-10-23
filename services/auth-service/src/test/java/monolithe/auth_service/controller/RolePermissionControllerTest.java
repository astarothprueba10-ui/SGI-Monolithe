package monolithe.auth_service.controller;

import monolithe.auth_service.dto.UpdateRoleRequest;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.service.RolePermissionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RolePermissionControllerTest {

    private RolePermissionService service;
    private RolePermissionController controller;

    @BeforeEach
    void setUp() {
        service = mock(RolePermissionService.class);
        controller = new RolePermissionController(service);
    }

    @Test
    void devuelveConflictoCuandoElNombreYaExiste() {
        when(service.actualizarRol(7L, "RRHH", "Recursos Humanos", null))
                .thenReturn(new SecurityOperationResult("ROL_EXISTENTE", "Nombre duplicado"));

        var response = controller.actualizarRol(jwt(), "RRHH", new UpdateRoleRequest("Recursos Humanos", null));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void devuelveConflictoSiExistenAsignacionesActivas() {
        when(service.desactivarRol(7L, "RRHH"))
                .thenReturn(new SecurityOperationResult("ASIGNACIONES_ACTIVAS", "Reasigna primero"));

        var response = controller.desactivarRol(jwt(), "RRHH");

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    }

    @Test
    void devuelveForbiddenCuandoElRolEstaProtegido() {
        when(service.desactivarRol(7L, "ADMINISTRADOR"))
                .thenReturn(new SecurityOperationResult("PROTEGIDO", "Rol protegido"));

        var response = controller.desactivarRol(jwt(), "ADMINISTRADOR");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void aceptaEdicionYReactivacionExitosas() {
        when(service.actualizarRol(7L, "RRHH", "Recursos Humanos", null))
                .thenReturn(new SecurityOperationResult("ACTUALIZADO", "Actualizado"));
        when(service.reactivarRol(7L, "RRHH"))
                .thenReturn(new SecurityOperationResult("REACTIVADO", "Reactivado"));

        var editResponse = controller.actualizarRol(jwt(), "RRHH", new UpdateRoleRequest("Recursos Humanos", null));
        var activateResponse = controller.reactivarRol(jwt(), "RRHH");

        assertEquals(HttpStatus.OK, editResponse.getStatusCode());
        assertEquals(HttpStatus.OK, activateResponse.getStatusCode());
    }

    @Test
    void devuelveForbiddenCuandoLaOperacionEsDenegadaPorLaBaseDeDatos() {
        when(service.reactivarRol(7L, "RRHH"))
                .thenReturn(new SecurityOperationResult("DENEGADO", "Permiso insuficiente"));

        var response = controller.reactivarRol(jwt(), "RRHH");

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void endpointsExigenRolPrivilegiadoYPermisoEspecifico() throws Exception {
        assertPolicy("actualizarRol", new Class<?>[]{Jwt.class, String.class, UpdateRoleRequest.class}, "roles.edit");
        assertPolicy("desactivarRol", new Class<?>[]{Jwt.class, String.class}, "roles.deactivate");
        assertPolicy("reactivarRol", new Class<?>[]{Jwt.class, String.class}, "roles.activate");
    }

    private void assertPolicy(String methodName, Class<?>[] parameters, String permission) throws Exception {
        Method method = RolePermissionController.class.getMethod(methodName, parameters);
        String policy = method.getAnnotation(PreAuthorize.class).value();
        assertTrue(policy.contains("ROLE_ADMINISTRADOR"));
        assertTrue(policy.contains("ROLE_GERENCIA"));
        assertTrue(policy.contains(permission));
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("test-token").header("alg", "none").subject("7").build();
    }
}
