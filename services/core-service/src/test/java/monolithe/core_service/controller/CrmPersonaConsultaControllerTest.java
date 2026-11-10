package monolithe.core_service.controller;

import monolithe.core_service.config.CrmIdentidadConfig;
import monolithe.core_service.config.RestTemplateConfig;
import monolithe.core_service.client.ConsultaDniClient;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.json.JsonMapper;
import monolithe.core_service.dto.ConsultaPersonaCrmRequest;
import monolithe.core_service.dto.ConsultaPersonaCrmResponse;
import monolithe.core_service.service.CrmPersonaConsultaService;
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
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmPersonaConsultaControllerTest {
    private AnnotationConfigApplicationContext context;
    private CrmPersonaConsultaController controller;
    private CrmPersonaConsultaService service;
    private final ConsultaPersonaCrmRequest request = new ConsultaPersonaCrmRequest("DNI", "00000001");

    @Configuration
    @EnableMethodSecurity(proxyTargetClass = true)
    static class SecurityTestConfig {
        @Bean
        CrmPersonaConsultaService service() { return mock(CrmPersonaConsultaService.class); }
        @Bean
        CrmPersonaConsultaController controller(CrmPersonaConsultaService service) {
            return new CrmPersonaConsultaController(service);
        }
    }

    @BeforeEach
    void preparar() {
        context = new AnnotationConfigApplicationContext(SecurityTestConfig.class);
        controller = context.getBean(CrmPersonaConsultaController.class);
        service = context.getBean(CrmPersonaConsultaService.class);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        context.close();
    }

    @Test
    void deniegaLaConsultaSinPermisoCrmCreate() {
        autenticar("crm.view");
        assertThrows(AccessDeniedException.class, () -> controller.consultar(request, jwt("1")));
        verifyNoInteractions(service);
    }

    @Test
    void permiteElPermisoDeCaptacionYSolicitaNoGuardarCache() {
        autenticar("crm.create");
        var expected = ConsultaPersonaCrmResponse.sinDatos(request, "NO_ENCONTRADO", "Sin datos");
        when(service.consultar(request)).thenReturn(expected);
        var response = controller.consultar(request, jwt("1"));
        assertEquals(expected, response.getBody());
        assertEquals("no-store", response.getHeaders().getCacheControl());
    }

    @Test
    void rechazaUnActorInvalidoAunqueTengaPermiso() {
        autenticar("crm.create");
        for (String subject : List.of("0", "-1", "invalido"))
            assertThrows(ResponseStatusException.class, () -> controller.consultar(request, jwt(subject)));
        assertThrows(ResponseStatusException.class, () -> controller.consultar(request, null));
        verifyNoInteractions(service);
    }

    @Test
    void elNuevoProveedorConservaElClienteHttpCompartidoSinAmbiguedad() {
        try (var configuration = new AnnotationConfigApplicationContext()) {
            configuration.registerBean(JsonMapper.class, () -> new JsonMapper());
            configuration.register(CrmIdentidadConfig.class, RestTemplateConfig.class);
            configuration.refresh();
            assertEquals(1, configuration.getBeansOfType(RestTemplate.class).size());
            assertNotNull(configuration.getBean(ConsultaDniClient.class));
        }
    }

    private void autenticar(String authority) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "usuario-prueba", "", List.of(new SimpleGrantedAuthority(authority))));
    }

    private Jwt jwt(String subject) {
        return new Jwt("token-de-prueba", Instant.now(), Instant.now().plusSeconds(60),
                Map.of("alg", "none"), Map.of("sub", subject));
    }
}
