package monolithe.auth_service.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

public class UserPrincipal implements UserDetails {

    private final Long idUsuario;
    private final String username;
    private final String password;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean enabled;
    private final boolean accountNonLocked;
    private final boolean requiereCambioPassword;

    public UserPrincipal(
            Long idUsuario,
            String username,
            String password,
            Collection<? extends GrantedAuthority> authorities,
            boolean enabled,
            boolean accountNonLocked,
            boolean requiereCambioPassword
    ) {
        this.idUsuario = idUsuario;
        this.username = username;
        this.password = password;
        this.authorities = authorities;
        this.enabled = enabled;
        this.accountNonLocked = accountNonLocked;
        this.requiereCambioPassword = requiereCambioPassword;
    }

    public Long getIdUsuario() {
        return idUsuario;
    }

    public boolean isRequiereCambioPassword() {
        return requiereCambioPassword;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}