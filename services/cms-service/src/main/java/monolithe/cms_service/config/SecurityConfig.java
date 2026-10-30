package monolithe.cms_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authorization.AuthorizationManagers;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
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
            JwtAuthenticationConverter jwtAuthenticationConverter)
            throws Exception {

        http
                .cors(cors -> {
                })

                .csrf(csrf -> csrf.disable())

                .formLogin(form -> form.disable())

                .httpBasic(basic -> basic.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/public/**")
                        .permitAll()

                        // Solo la recepcion de consultas/leads es POST publico.
                        // Nuevas rutas publicas de escritura deben revisarse expresamente.
                        .requestMatchers(HttpMethod.POST, "/api/public/consultas")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/public/**")
                        .denyAll()

                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/error")
                        .permitAll()

                        // Solo permitir escritura de borradores en rutas explícitas.
                        // Los endpoints heredados de publicación/escritura siguen bloqueados.
                        .requestMatchers(HttpMethod.POST, "/api/cms/borradores/paginas")
                        .hasAuthority("web_content.edit")
                        .requestMatchers(HttpMethod.POST, "/api/cms/borradores/visibilidades")
                        .hasAuthority("web_content.projects_visibility")
                        .requestMatchers(HttpMethod.PUT, "/api/cms/borradores/{idBorrador}/paginas")
                        .hasAuthority("web_content.edit")
                        .requestMatchers(HttpMethod.PUT, "/api/cms/borradores/{idBorrador}/visibilidades")
                        .hasAuthority("web_content.projects_visibility")
                        .requestMatchers(HttpMethod.PATCH, "/api/cms/borradores/{idBorrador}/paginas/descartar")
                        .hasAuthority("web_content.edit")
                        .requestMatchers(HttpMethod.PATCH, "/api/cms/borradores/{idBorrador}/visibilidades/descartar")
                        .hasAuthority("web_content.projects_visibility")

                        // Imagenes privadas: escrituras solo sobre borradores propios.
                        .requestMatchers(HttpMethod.PUT, "/api/cms/borradores/{idBorrador}/imagenes/{idSeccion}")
                        .hasAuthority("web_content.edit")
                        .requestMatchers(HttpMethod.DELETE, "/api/cms/borradores/{idBorrador}/imagenes/{idSeccion}")
                        .hasAuthority("web_content.edit")
                        // Publicación de visibilidad: requiere permisos tanto de
                        // administración de proyectos web como de publicación.
                        .requestMatchers(HttpMethod.GET, "/api/cms/borradores/visibilidades/proyectos")
                        .hasAuthority("web_content.projects_visibility")
                        .requestMatchers(HttpMethod.POST, "/api/cms/borradores/{idBorrador}/visibilidades/publicar")
                        .access(AuthorizationManagers.allOf(
                                AuthorityAuthorizationManager.hasAuthority("web_content.projects_visibility"),
                                AuthorityAuthorizationManager.hasAuthority("web_content.publish")))

                        .requestMatchers(HttpMethod.POST, "/api/cms/borradores/{idBorrador}/paginas/publicar-contenido")
                        .hasAuthority("web_content.publish")

                        // Único endpoint de publicación habilitado en 3E.3.
                        .requestMatchers(HttpMethod.POST, "/api/cms/borradores/{idBorrador}/paginas/publicar")
                        .hasAuthority("web_content.publish")

                        .requestMatchers(HttpMethod.GET, "/api/cms/**")
                        .hasAuthority("web_content.view")

                        .requestMatchers("/api/cms/**")
                        .denyAll()

                        .anyRequest()
                        .authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(
                                        jwtAuthenticationConverter)));

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtGrantedAuthoritiesConverter authoritiesConverter =
                new JwtGrantedAuthoritiesConverter();

        authoritiesConverter.setAuthoritiesClaimName("authorities");

        authoritiesConverter.setAuthorityPrefix("");

        JwtAuthenticationConverter converter =
                new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(
                authoritiesConverter);

        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
        Arrays.stream(allowedOrigins.split(","))
                .map(origin -> origin.trim())
                .filter(origin -> !origin.isBlank())
                .toList());

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"));

        configuration.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Accept"));

        configuration.setExposedHeaders(
                List.of("Authorization"));

        configuration.setAllowCredentials(true);

        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration);

        return source;
    }
}