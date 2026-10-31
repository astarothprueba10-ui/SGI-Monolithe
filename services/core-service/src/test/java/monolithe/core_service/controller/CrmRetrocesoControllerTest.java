package monolithe.core_service.controller;

import monolithe.core_service.dto.ResolverRetrocesoCrmRequest;
import monolithe.core_service.dto.SolicitarRetrocesoCrmRequest;
import monolithe.core_service.service.CrmRetrocesoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.lang.reflect.Method;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmRetrocesoControllerTest {

    private CrmRetrocesoService service;
    private CrmRetrocesoController controller;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        service = mock(CrmRetrocesoService.class);
        controller = new CrmRetrocesoController(service);
        jsonMapper = new JsonMapper();
    }

    private Jwt buildJwt(String subject, String... authorities) {
        String authStr = String.join(" ", authorities);
        return new Jwt(
                "token-retroceso",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", subject, "authorities", authStr)
        );
    }

    @Test
    void solicitaRetrocesoDesdeController() {
        ObjectNode nodo = jsonMapper.createObjectNode();
        nodo.put("id_solicitud", 10L);
        var req = new SolicitarRetrocesoCrmRequest("NUEVO", null, "ERROR_DATOS", "Ingreso duplicado", null);
        when(service.solicitarRetroceso(5L, 3L, req)).thenReturn(nodo);

        ResponseEntity<JsonNode> response = controller.solicitarRetroceso(3L, req, buildJwt("5", "crm.edit"));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(10L, response.getBody().path("id_solicitud").asLong());
        verify(service).solicitarRetroceso(5L, 3L, req);
    }

    @Test
    void listaSolicitudesDesdeController() {
        ObjectNode pagina = jsonMapper.createObjectNode();
        pagina.putArray("items");
        pagina.put("total", 0);
        pagina.put("pagina", 1);
        pagina.put("tamano", 15);
        pagina.put("paginas", 0);
        OffsetDateTime desde = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        OffsetDateTime hasta = OffsetDateTime.now(ZoneOffset.UTC);
        when(service.listarSolicitudes(2L, desde, hasta, "PENDIENTE", "test", 1, 15, null)).thenReturn(pagina);

        JsonNode response = controller.listarSolicitudes(desde, hasta, "PENDIENTE", "test", 1, 15,
                buildJwt("2", "ROLE_GERENCIA"));

        assertTrue(response.isObject());
        assertTrue(response.has("items"));
        assertEquals(0, response.path("total").asInt());
        verify(service).listarSolicitudes(2L, desde, hasta, "PENDIENTE", "test", 1, 15, null);
    }

    @Test
    void obtieneIndicadoresDesdeController() {
        ObjectNode indicadores = jsonMapper.createObjectNode();
        indicadores.put("total", 15);
        OffsetDateTime desde = OffsetDateTime.now(ZoneOffset.UTC).minusDays(30);
        OffsetDateTime hasta = OffsetDateTime.now(ZoneOffset.UTC);
        when(service.obtenerIndicadores(2L, desde, hasta, null)).thenReturn(indicadores);

        JsonNode response = controller.obtenerIndicadores(desde, hasta, buildJwt("2", "ROLE_SUPERVISOR_COMERCIAL"));

        assertEquals(15, response.path("total").asInt());
        verify(service).obtenerIndicadores(2L, desde, hasta, null);
    }

    @Test
    void catalogoMotivosDesdeController() {
        ArrayNode catalogo = jsonMapper.createArrayNode();
        when(service.catalogoMotivos(4L)).thenReturn(catalogo);

        JsonNode response = controller.catalogoMotivos(buildJwt("4", "crm.view"));

        assertTrue(response.isArray());
        verify(service).catalogoMotivos(4L);
    }

    @Test
    void resuelveDecisionDesdeController() {
        ObjectNode decision = jsonMapper.createObjectNode();
        decision.put("estado", "APROBADA");
        var req = new ResolverRetrocesoCrmRequest(true, null, "Aprobado");
        when(service.resolverRetroceso(1L, 10L, req)).thenReturn(decision);

        JsonNode response = controller.resolverRetroceso(10L, req, buildJwt("1", "ROLE_GERENCIA"));

        assertEquals("APROBADA", response.path("estado").asString());
        verify(service).resolverRetroceso(1L, 10L, req);
    }

    @Test
    void rechazaJwtSinSubject() {
        Jwt jwt = new Jwt("token", Instant.now(), Instant.now().plusSeconds(3600),
                Map.of("alg", "none"), Map.of("authorities", "crm.view"));

        var ex = assertThrows(ResponseStatusException.class, () -> controller.catalogoMotivos(jwt));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(service);
    }

    @Test
    void rechazaJwtSubjectInvalido() {
        Jwt jwt = buildJwt("no-es-numero", "crm.view");

        var ex = assertThrows(ResponseStatusException.class, () -> controller.catalogoMotivos(jwt));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(service);
    }

    @Test
    void verificaAnotacionesDeSeguridad() throws NoSuchMethodException {
        Method listar = CrmRetrocesoController.class.getMethod("listarSolicitudes",
                OffsetDateTime.class, OffsetDateTime.class, String.class, String.class, Integer.class, Integer.class, Jwt.class);
        PreAuthorize preListar = listar.getAnnotation(PreAuthorize.class);
        assertNotNull(preListar);
        assertTrue(preListar.value().contains("ROLE_GERENCIA"));
        assertTrue(preListar.value().contains("ROLE_SUPERVISOR_COMERCIAL"));

        Method decision = CrmRetrocesoController.class.getMethod("resolverRetroceso",
                Long.class, ResolverRetrocesoCrmRequest.class, Jwt.class);
        PreAuthorize preDecision = decision.getAnnotation(PreAuthorize.class);
        assertNotNull(preDecision);
        assertTrue(preDecision.value().contains("ROLE_GERENCIA"));
        assertTrue(preDecision.value().contains("ROLE_SUPERVISOR_COMERCIAL"));
    }
}
