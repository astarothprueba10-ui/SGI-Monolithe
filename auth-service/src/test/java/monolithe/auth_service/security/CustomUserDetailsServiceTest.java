package monolithe.auth_service.security;

import monolithe.auth_service.entity.Permission;
import monolithe.auth_service.entity.Role;
import monolithe.auth_service.entity.RolePermission;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.entity.UserRole;
import monolithe.auth_service.entity.UserStatus;
import monolithe.auth_service.repository.RolePermissionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomUserDetailsServiceTest {

    private UserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private RolePermissionRepository rolePermissionRepository;

    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {

        userRepository = mock(UserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        rolePermissionRepository =
                mock(RolePermissionRepository.class);

        userDetailsService =
                new CustomUserDetailsService(
                        userRepository,
                        userRoleRepository,
                        rolePermissionRepository
                );
    }

    @Test
    void debeCargarRolYPermisosActivosComoAuthorities() {

        User usuario = crearUsuarioActivo();

        Role rolAdministrador = new Role();
        rolAdministrador.setIdRol(1);
        rolAdministrador.setCodigo("ADMINISTRADOR");
        rolAdministrador.setActivo(true);

        UserRole usuarioRol = new UserRole();
        usuarioRol.setRol(rolAdministrador);

        Permission permisoAuditoria = new Permission();
        permisoAuditoria.setIdPermiso(1);
        permisoAuditoria.setCodigo(
                "SEGURIDAD_AUDITORIA_VER"
        );
        permisoAuditoria.setActivo(true);

        RolePermission rolPermiso =
                new RolePermission();

        rolPermiso.setPermiso(
                permisoAuditoria
        );

        when(userRepository
                .findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        when(userRoleRepository
                .findByUsuarioIdUsuarioAndActivoTrue(1L))
                .thenReturn(
                        List.of(usuarioRol)
                );

        when(rolePermissionRepository
                .findByRolIdRolAndActivoTrue(1))
                .thenReturn(
                        List.of(rolPermiso)
                );

        UserPrincipal principal =
                (UserPrincipal) userDetailsService
                        .loadUserByUsername("admin");

        List<String> authorities =
                principal.getAuthorities()
                        .stream()
                        .map(authority -> authority.getAuthority())
                        .toList();

        assertTrue(
                authorities.contains(
                        "ROLE_ADMINISTRADOR"
                )
        );

        assertTrue(
                authorities.contains(
                        "SEGURIDAD_AUDITORIA_VER"
                )
        );

        assertTrue(principal.isEnabled());
        assertTrue(principal.isAccountNonLocked());
    }

    @Test
    void noDebeAgregarRolInactivo() {

        User usuario = crearUsuarioActivo();

        Role rolInactivo = new Role();
        rolInactivo.setIdRol(2);
        rolInactivo.setCodigo("GERENCIA");
        rolInactivo.setActivo(false);

        UserRole usuarioRol = new UserRole();
        usuarioRol.setRol(rolInactivo);

        when(userRepository
                .findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        when(userRoleRepository
                .findByUsuarioIdUsuarioAndActivoTrue(1L))
                .thenReturn(
                        List.of(usuarioRol)
                );

        UserPrincipal principal =
                (UserPrincipal) userDetailsService
                        .loadUserByUsername("admin");

        List<String> authorities =
                principal.getAuthorities()
                        .stream()
                        .map(authority -> authority.getAuthority())
                        .toList();

        assertFalse(
                authorities.contains(
                        "ROLE_GERENCIA"
                )
        );

        verify(
                rolePermissionRepository,
                never()
        ).findByRolIdRolAndActivoTrue(
                anyInt()
        );
    }

    @Test
    void noDebeAgregarPermisoInactivo() {

        User usuario = crearUsuarioActivo();

        Role rolAdministrador = new Role();
        rolAdministrador.setIdRol(1);
        rolAdministrador.setCodigo("ADMINISTRADOR");
        rolAdministrador.setActivo(true);

        UserRole usuarioRol = new UserRole();
        usuarioRol.setRol(rolAdministrador);

        Permission permisoInactivo =
                new Permission();

        permisoInactivo.setCodigo(
                "SEGURIDAD_PERMISO_GESTIONAR"
        );
        permisoInactivo.setActivo(false);

        RolePermission rolPermiso =
                new RolePermission();

        rolPermiso.setPermiso(
                permisoInactivo
        );

        when(userRepository
                .findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        when(userRoleRepository
                .findByUsuarioIdUsuarioAndActivoTrue(1L))
                .thenReturn(
                        List.of(usuarioRol)
                );

        when(rolePermissionRepository
                .findByRolIdRolAndActivoTrue(1))
                .thenReturn(
                        List.of(rolPermiso)
                );

        UserPrincipal principal =
                (UserPrincipal) userDetailsService
                        .loadUserByUsername("admin");

        List<String> authorities =
                principal.getAuthorities()
                        .stream()
                        .map(authority -> authority.getAuthority())
                        .toList();

        assertTrue(
                authorities.contains(
                        "ROLE_ADMINISTRADOR"
                )
        );

        assertFalse(
                authorities.contains(
                        "SEGURIDAD_PERMISO_GESTIONAR"
                )
        );
    }

    private User crearUsuarioActivo() {

        UserStatus estado = new UserStatus();
        estado.setActivo(true);
        estado.setPermiteAcceso(true);

        User usuario = new User();

        usuario.setIdUsuario(1L);
        usuario.setUsuarioLogin("admin");
        usuario.setPasswordHash("hash-password");
        usuario.setEstadoUsuario(estado);
        usuario.setRequiereCambioPassword(false);
        usuario.setBloqueadoHasta(null);

        return usuario;
    }
}