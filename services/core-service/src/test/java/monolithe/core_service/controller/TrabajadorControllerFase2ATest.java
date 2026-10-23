package monolithe.core_service.controller;

import monolithe.core_service.dto.CesarTrabajadorRequest;
import monolithe.core_service.dto.ProgramarSuspensionRequest;
import monolithe.core_service.dto.ResolverReincorporacionRequest;
import monolithe.core_service.dto.SolicitarReincorporacionRequest;
import monolithe.core_service.service.TrabajadorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TrabajadorControllerFase2ATest {

    private TrabajadorService trabajadorService;
    private TrabajadorController trabajadorController;
    private ReincorporacionController reincorporacionController;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        trabajadorService = mock(TrabajadorService.class);
        trabajadorController = new TrabajadorController(trabajadorService);
        reincorporacionController = new ReincorporacionController(trabajadorService);
        jsonMapper = new JsonMapper();
    }

    private Jwt buildJwt(String subject) {
        return new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", subject, "authorities", "hr.edit"));
    }

    @Test
    void debeProgramarSuspension() {
        OffsetDateTime inicio = OffsetDateTime.now(ZoneOffset.UTC).plusDays(1);
        OffsetDateTime fin = inicio.plusWeeks(2);
        ProgramarSuspensionRequest request = new ProgramarSuspensionRequest(inicio, fin, "Licencia médica");

        ObjectNode node = jsonMapper.createObjectNode().put("idSuspension", 50L);
        when(trabajadorService.programarSuspension(5L, 10L, request)).thenReturn(node);

        ResponseEntity<JsonNode> response = trabajadorController.programarSuspension(10L, request, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(50L, response.getBody().get("idSuspension").asLong());
        verify(trabajadorService).programarSuspension(5L, 10L, request);
    }

    @Test
    void debeCesarTrabajador() {
        LocalDate fecha = LocalDate.now();
        CesarTrabajadorRequest request = new CesarTrabajadorRequest(fecha, "Mutuo acuerdo");

        ObjectNode node = jsonMapper.createObjectNode().put("idTrabajador", 10L);
        when(trabajadorService.cesarTrabajador(5L, 10L, request)).thenReturn(node);

        ResponseEntity<JsonNode> response = trabajadorController.cesarTrabajador(10L, request, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(10L, response.getBody().get("idTrabajador").asLong());
        verify(trabajadorService).cesarTrabajador(5L, 10L, request);
    }

    @Test
    void debeSolicitarReincorporacion() {
        LocalDate fecha = LocalDate.now().plusDays(14);
        SolicitarReincorporacionRequest request = new SolicitarReincorporacionRequest(fecha, "Reincorporacion autorizada");

        ObjectNode node = jsonMapper.createObjectNode().put("idSolicitud", 77L);
        when(trabajadorService.solicitarReincorporacion(5L, 10L, request)).thenReturn(node);

        ResponseEntity<JsonNode> response = trabajadorController.solicitarReincorporacion(10L, request, buildJwt("5"));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(77L, response.getBody().get("idSolicitud").asLong());
        verify(trabajadorService).solicitarReincorporacion(5L, 10L, request);
    }

    @Test
    void debeResolverReincorporacion() {
        ResolverReincorporacionRequest request = new ResolverReincorporacionRequest("APROBAR", "Resolucion conforme", null);

        ObjectNode node = jsonMapper.createObjectNode().put("idSolicitud", 77L).put("estado", "APROBADO");
        when(trabajadorService.resolverReincorporacion(5L, 77L, request)).thenReturn(node);

        ResponseEntity<JsonNode> response = reincorporacionController.resolver(77L, request, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("APROBADO", response.getBody().get("estado").asString());
        verify(trabajadorService).resolverReincorporacion(5L, 77L, request);
    }

    @Test
    void debeRechazarJwtInvalido() {
        LocalDate fecha = LocalDate.now();
        CesarTrabajadorRequest request = new CesarTrabajadorRequest(fecha, "Mutuo acuerdo");

        Jwt jwtInvalido = new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", "abc", "authorities", "hr.edit"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> trabajadorController.cesarTrabajador(10L, request, jwtInvalido));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void debeListarReincorporaciones() {
        ObjectNode node = jsonMapper.createObjectNode();
        node.putArray("solicitudes");
        node.put("totalMostrado", 0);

        when(trabajadorService.listarReincorporaciones(5L, "PENDIENTE", 15L)).thenReturn(node);

        ResponseEntity<JsonNode> response = reincorporacionController.listar("PENDIENTE", 15L, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().get("totalMostrado").asInt());
        verify(trabajadorService).listarReincorporaciones(5L, "PENDIENTE", 15L);
    }

    @Test
    void debeListarReincorporacionesSinFiltros() {
        ObjectNode node = jsonMapper.createObjectNode();
        node.putArray("solicitudes");
        node.put("totalMostrado", 0);

        when(trabajadorService.listarReincorporaciones(5L, null, null)).thenReturn(node);

        ResponseEntity<JsonNode> response = reincorporacionController.listar(null, null, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(trabajadorService).listarReincorporaciones(5L, null, null);
    }

    @Test
    void debeRechazarListarReincorporacionesConJwtInvalido() {
        Jwt jwtInvalido = new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", "no-numerico", "authorities", "hr.view"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> reincorporacionController.listar(null, null, jwtInvalido));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void debeListarHistorialLaboral() {
        ObjectNode node = jsonMapper.createObjectNode();
        node.putArray("movimientos");
        node.put("total", 0);

        LocalDate desde = LocalDate.of(2026, 1, 1);
        LocalDate hasta = LocalDate.of(2026, 1, 31);
        when(trabajadorService.listarHistorialLaboral(5L, 10L, "INGRESO", desde, hasta)).thenReturn(node);

        ResponseEntity<JsonNode> response = trabajadorController.listarHistorialLaboral(
                10L, "INGRESO", desde, hasta, buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(0, response.getBody().get("total").asInt());
        verify(trabajadorService).listarHistorialLaboral(5L, 10L, "INGRESO", desde, hasta);
    }

    @Test
    void debeObtenerMetricasTrabajadores() {
        ObjectNode node = jsonMapper.createObjectNode();
        node.put("nuevosTrabajadores", 5);
        node.put("reincorporacionesAprobadas", 2);
        node.put("suspendidosActuales", 1);
        node.put("cesesRegistrados", 0);

        when(trabajadorService.obtenerMetricasTrabajadores(5L)).thenReturn(node);

        ResponseEntity<JsonNode> response = trabajadorController.obtenerMetricasTrabajadores(buildJwt("5"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(5, response.getBody().get("nuevosTrabajadores").asInt());
        verify(trabajadorService).obtenerMetricasTrabajadores(5L);
    }
}
