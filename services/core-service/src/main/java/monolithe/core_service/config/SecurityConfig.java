package monolithe.core_service.config;

import monolithe.core_service.security.RestAccessDeniedHandler;
import monolithe.core_service.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

        @Value("${security.cors.allowed-origins}")
        private String allowedOrigins;

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http,
                        JwtAuthenticationConverter jwtAuthenticationConverter,
                        RestAuthenticationEntryPoint restAuthenticationEntryPoint,
                        RestAccessDeniedHandler restAccessDeniedHandler) throws Exception {

                http
                                .cors(cors -> {
                                })
                                .csrf(csrf -> csrf.disable())
                                .formLogin(form -> form.disable())
                                .httpBasic(basic -> basic.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(restAuthenticationEntryPoint)
                                                .accessDeniedHandler(restAccessDeniedHandler))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                "/actuator/health",
                                                                "/actuator/health/**",
                                                                "/actuator/info",
                                                                "/error")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/core/**")
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                false))
                                                .requestMatchers(HttpMethod.POST, "/api/core/**")
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                true))
                                                .requestMatchers(HttpMethod.PUT, "/api/core/**")
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                true))
                                                .requestMatchers(HttpMethod.PATCH, "/api/core/**")
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                true))
                                                .requestMatchers(HttpMethod.DELETE, "/api/core/**")
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                true))
                                                .anyRequest()
                                                .access((authentication, context) -> evaluarAcceso(authentication.get(),
                                                                false)))
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .authenticationEntryPoint(restAuthenticationEntryPoint)
                                                .accessDeniedHandler(restAccessDeniedHandler)
                                                .jwt(jwt -> jwt
                                                                .jwtAuthenticationConverter(
                                                                                jwtAuthenticationConverter)));

                return http.build();
        }

        @Bean
        public JwtAuthenticationConverter jwtAuthenticationConverter() {
                JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
                authoritiesConverter.setAuthoritiesClaimName("authorities");
                authoritiesConverter.setAuthorityPrefix("");
                JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
                converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
                return converter;
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(
                                Arrays.stream(allowedOrigins.split(","))
                                                .map(origin -> origin == null ? "" : origin.trim())
                                                .filter(o -> !o.isBlank())
                                                .toList());
                configuration.setAllowedMethods(
                                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(
                                List.of("Authorization", "Content-Type", "Accept"));
                configuration.setExposedHeaders(List.of("Authorization"));
                configuration.setAllowCredentials(true);
                configuration.setMaxAge(3600L);
                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }

        private AuthorizationDecision evaluarAcceso(
                        org.springframework.security.core.Authentication auth,
                        boolean requiereEscritura) {
                if (auth == null || !auth.isAuthenticated()) {
                        return new AuthorizationDecision(false);
                }
                if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
                        return new AuthorizationDecision(false);
                }
                Boolean cambioPendiente = jwtAuth.getToken()
                                .getClaim("password_change_required");
                if (Boolean.TRUE.equals(cambioPendiente)) {
                        return new AuthorizationDecision(false);
                }
                if (!requiereEscritura) {
                        return new AuthorizationDecision(true);
                }
                boolean tieneRol = auth.getAuthorities().stream()
                                .anyMatch(a -> "ROLE_ADMINISTRADOR".equals(a.getAuthority())
                                                || "ROLE_GERENCIA".equals(a.getAuthority()));
                return new AuthorizationDecision(tieneRol);
        }
}