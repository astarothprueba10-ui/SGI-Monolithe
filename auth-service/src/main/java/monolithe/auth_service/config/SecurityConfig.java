package monolithe.auth_service.config;

import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.RestAccessDeniedHandler;
import monolithe.auth_service.security.RestAuthenticationEntryPoint;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthenticationConverter,
            RestAuthenticationEntryPoint restAuthenticationEntryPoint,
            RestAccessDeniedHandler restAccessDeniedHandler) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .formLogin(form -> form.disable())

                .httpBasic(basic -> basic.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler))

                .authorizeHttpRequests(auth -> auth

                        // Rutas públicas
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/actuator/health",
                                "/actuator/info")
                        .permitAll()

                        .requestMatchers("/api/auth/change-password")
                        .authenticated()

                        .anyRequest()
                        .access((authentication, context) -> {

                            var authActual = authentication.get();

                            if (!authActual.isAuthenticated()) {
                                return new AuthorizationDecision(false);
                            }

                            if (authActual instanceof JwtAuthenticationToken jwtAuthentication) {

                                Boolean requiereCambioPassword =
                                        jwtAuthentication
                                                .getToken()
                                                .getClaim("password_change_required");

                                return new AuthorizationDecision(
                                        !Boolean.TRUE.equals(requiereCambioPassword));
                            }

                            return new AuthorizationDecision(false);
                        }))

                .oauth2ResourceServer(oauth2 -> oauth2
                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                        .accessDeniedHandler(restAccessDeniedHandler)
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)));

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtGrantedAuthoritiesConverter authoritiesConverter =
                new JwtGrantedAuthoritiesConverter();

        authoritiesConverter.setAuthoritiesClaimName("authorities");

        /*
         * No agregamos prefijo porque el JWT ya contiene:
         * ROLE_ADMINISTRADOR
         * ROLE_GERENCIA
         * etc.
         */
        authoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter jwtAuthenticationConverter =
                new JwtAuthenticationConverter();

        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(
                authoritiesConverter);

        return jwtAuthenticationConverter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            CustomUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider authenticationProvider =
                new DaoAuthenticationProvider(userDetailsService);

        authenticationProvider.setPasswordEncoder(passwordEncoder);

        return new ProviderManager(authenticationProvider);
    }
}