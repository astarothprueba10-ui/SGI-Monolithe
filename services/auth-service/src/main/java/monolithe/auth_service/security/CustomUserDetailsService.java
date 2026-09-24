package monolithe.auth_service.security;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.Permission;
import monolithe.auth_service.entity.Role;
import monolithe.auth_service.entity.RolePermission;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.entity.UserRole;
import monolithe.auth_service.repository.RolePermissionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.UserRoleRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

        private final UserRepository usuarioRepository;
        private final UserRoleRepository usuarioRolRepository;
        private final RolePermissionRepository rolPermisoRepository;

        @Override
        @Transactional(readOnly = true)
        public UserDetails loadUserByUsername(String username)
                        throws UsernameNotFoundException {

                User usuario = usuarioRepository.findByUsuarioLogin(username)
                                .orElseThrow(() -> new UsernameNotFoundException(
                                                "Usuario no encontrado"));

                Set<String> authorities = new LinkedHashSet<>();

                List<UserRole> usuarioRoles = usuarioRolRepository
                                .findByUsuarioIdUsuarioAndActivoTrue(
                                                usuario.getIdUsuario());

                for (UserRole usuarioRol : usuarioRoles) {

                        Role rol = usuarioRol.getRol();

                        if (!Boolean.TRUE.equals(rol.getActivo())) {
                                continue;
                        }

                        authorities.add(
                                        "ROLE_" + rol.getCodigo());

                        List<RolePermission> rolPermisos = rolPermisoRepository
                                        .findByRolIdRolAndActivoTrue(
                                                        rol.getIdRol());

                        for (RolePermission rolPermiso : rolPermisos) {

                                Permission permiso = rolPermiso.getPermiso();

                                if (Boolean.TRUE.equals(permiso.getActivo())) {
                                        authorities.add(permiso.getCodigo());
                                }
                        }
                }

                boolean enabled = usuario.getEstadoUsuario() != null
                                && "USUARIO".equals(
                                                usuario.getEstadoUsuario().getEntidad())
                                && Boolean.TRUE.equals(
                                                usuario.getEstadoUsuario().getActivo())
                                && Boolean.TRUE.equals(
                                                usuario.getEstadoUsuario().getPermiteAcceso());

                boolean accountNonLocked = usuario.getBloqueadoHasta() == null
                                || usuario.getBloqueadoHasta()
                                                .isBefore(LocalDateTime.now(ZoneOffset.UTC))
                                || usuario.getBloqueadoHasta()
                                                .isEqual(LocalDateTime.now(ZoneOffset.UTC));

                return new UserPrincipal(
                                usuario.getIdUsuario(),
                                usuario.getUsuarioLogin(),
                                usuario.getPasswordHash(),
                                authorities.stream()
                                                .map(SimpleGrantedAuthority::new)
                                                .toList(),
                                enabled,
                                accountNonLocked,
                                Boolean.TRUE.equals(
                                                usuario.getRequiereCambioPassword()));
        }
}