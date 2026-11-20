package monolithe.core_service.controller;

import monolithe.core_service.dto.*;
import monolithe.core_service.service.TrabajadorPersonaConsultaService;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrabajadorPersonaConsultaControllerTest {
    private AnnotationConfigApplicationContext context;
    private TrabajadorPersonaConsultaController controller;
    private TrabajadorPersonaConsultaService service;
    private final ConsultaPersonaTrabajadorRequest request = new ConsultaPersonaTrabajadorRequest(17, "00000001");

    @Configuration
    @EnableMethodSecurity(proxyTargetClass = true)
    static class Config {
        @Bean
        TrabajadorPersonaConsultaService service() { return mock(TrabajadorPersonaConsultaService.class); }
        @Bean
        TrabajadorPersonaConsultaController controller(TrabajadorPersonaConsultaService service) { return new TrabajadorPersonaConsultaController(service); }
    }

    @BeforeEach
    void prepare() {
        context = new AnnotationConfigApplicationContext(Config.class);
        controller = context.getBean(TrabajadorPersonaConsultaController.class);
        service = context.getBean(TrabajadorPersonaConsultaService.class);
    }

    @AfterEach
    void cleanup() { SecurityContextHolder.clearContext(); context.close(); }

    @Test
    void recursosHumanosConsultaSinNecesitarPermisosDeCrm() {
        authenticate("hr.create"); var expected = ConsultaPersonaTrabajadorResponse.sinDatos(request, "NO_ENCONTRADO");
        when(service.consultar(1L, request)).thenReturn(expected);
        var response = controller.consultar(request, jwt("1"));
        assertEquals(expected, response.getBody()); assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void deniegaLaConsultaConPermisosDeCrmOConsultaSinAlta() {
        for (String permission : new String[] { "crm.create", "hr.view" }) {
            authenticate(permission); assertThrows(AccessDeniedException.class, () -> controller.consultar(request, jwt("1")));
        }
        verifyNoInteractions(service);
    }

    @Test
    void compruebaElActorAntesDeConsultar() {
        authenticate("hr.create");
        for (String subject : new String[] { "0", "-1", "invalido" })
            assertThrows(ResponseStatusException.class, () -> controller.consultar(request, jwt(subject)));
        assertThrows(ResponseStatusException.class, () -> controller.consultar(request, null)); verifyNoInteractions(service);
    }

    private void authenticate(String permission) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("1", "unused", List.of(new SimpleGrantedAuthority(permission))));
    }

    private Jwt jwt(String subject) {
        return Jwt.withTokenValue("test").header("alg", "RS256").subject(subject).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
    }
}
