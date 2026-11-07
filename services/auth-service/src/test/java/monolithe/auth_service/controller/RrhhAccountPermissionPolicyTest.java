package monolithe.auth_service.controller;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import java.util.Arrays;
import monolithe.auth_service.service.UserAccountUpdateService;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

class RrhhAccountPermissionPolicyTest {

    @Test
    void rrhhPuedeConsultarUsuariosRolesPermisosYPersonas() {
        comprobar(SecurityQueryController.class, "listarUsuarios", "users.view");
        comprobar(SecurityQueryController.class, "listarRoles", "roles.view");
        comprobar(SecurityQueryController.class, "listarPermisos", "permissions.view");
        comprobar(SecurityQueryController.class, "listarPersonas", "users.create");
    }

    @Test
    void operacionesDeUsuariosExigenRolYPermisos() {
        comprobar(UserManagementController.class, "crearUsuario", "users.create");
        comprobar(UserManagementController.class, "activarUsuario", "users.activate");
        comprobar(UserManagementController.class, "desactivarUsuario", "users.deactivate");
        comprobar(UserManagementController.class, "asignarRol", "users.assign_role");
        comprobar(UserManagementController.class, "revocarRol", "users.assign_role");
        comprobar(UserManagementController.class, "actualizarUsuario", "users.edit");
        comprobar(UserAccountUpdateService.class, "actualizar", "users.edit");
    }

    @Test
    void operacionesDeRolesExigenRolYPermisos() {
        comprobar(RolePermissionController.class, "crearRol", "roles.create");
        comprobar(RolePermissionController.class, "actualizarPermisos", "roles.assign_permissions");
        comprobar(RolePermissionController.class, "actualizarRol", "roles.edit");
        comprobar(RolePermissionController.class, "desactivarRol", "roles.deactivate");
        comprobar(RolePermissionController.class, "reactivarRol", "roles.activate");
    }

    private void comprobar(Class<?> clazz, String nombreMetodo, String permiso) {
        Method method = Arrays.stream(clazz.getDeclaredMethods())
                .filter(m -> m.getName().equals(nombreMetodo))
                .findFirst()
                .orElseThrow();
        PreAuthorize policy = method.getAnnotation(PreAuthorize.class);
        assertNotNull(policy, "Falta @PreAuthorize en " + nombreMetodo);
        assertTrue(policy.value().contains("ROLE_RRHH"), "RRHH no está autorizado en " + nombreMetodo);
        assertTrue(policy.value().contains(permiso), "Falta permiso " + permiso + " en " + nombreMetodo);
    }
}
