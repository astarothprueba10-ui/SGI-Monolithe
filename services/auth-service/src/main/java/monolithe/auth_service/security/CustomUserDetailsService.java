package monolithe.auth_service.security;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.AuthenticationContext;
import monolithe.auth_service.repository.AuthenticationContextRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final AuthenticationContextRepository authenticationContextRepository;

    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        AuthenticationContext contexto = authenticationContextRepository
                .obtenerPorLogin(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Usuario no encontrado"));

        boolean enabled = contexto.estadoActivo()
                && contexto.permiteAcceso();

        boolean accountNonLocked = contexto.bloqueadoHasta() == null
                || contexto.bloqueadoHasta()
                        .isBefore(LocalDateTime.now(ZoneOffset.UTC))
                || contexto.bloqueadoHasta()
                        .isEqual(LocalDateTime.now(ZoneOffset.UTC));

        List<SimpleGrantedAuthority> authorities = contexto.authorities()
                .stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        return new UserPrincipal(
                contexto.idUsuario(),
                contexto.usuarioLogin(),
                contexto.passwordHash(),
                authorities,
                enabled,
                accountNonLocked,
                contexto.requiereCambioPassword());
    }
}