package monolithe.core_service.controller;

import monolithe.core_service.dto.ResolverCorreccionRequest;
import monolithe.core_service.service.EvidenciaCorreccionService;
import monolithe.core_service.service.TrabajadorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CorreccionDocumentalControllerTest {

    private TrabajadorService trabajadorService;
    private EvidenciaCorreccionService evidenciaService;
    private CorreccionDocumentalController controller;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        trabajadorService = mock(TrabajadorService.class);
        evidenciaService = mock(EvidenciaCorreccionService.class);
        controller = new CorreccionDocumentalController(trabajadorService, evidenciaService);
        jsonMapper = new JsonMapper();
    }

    private Jwt buildJwt(String subject) {
        return new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", subject, "authorities", "hr.approve"));
    }

    @Test
    void debeListarPendientesDesdeController() {
        ArrayNode lista = jsonMapper.createArrayNode();
        lista.add(jsonMapper.createObjectNode());
        when(trabajadorService.listarSolicitudesCorreccion(7L)).thenReturn(lista);

        ResponseEntity<JsonNode> response = controller.listarPendientes(buildJwt("7"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isArray());
        verify(trabajadorService).listarSolicitudesCorreccion(7L);
    }

    @Test
    void debeObtenerDetalleDesdeController() {
        ObjectNode detalle = jsonMapper.createObjectNode();
        detalle.put("idSolicitud", 3L);
        when(trabajadorService.obtenerDetalleCorreccion(7L, 3L)).thenReturn(detalle);

        ResponseEntity<JsonNode> response = controller.obtenerDetalle(3L, buildJwt("7"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(3L, response.getBody().get("idSolicitud").longValue());
        verify(trabajadorService).obtenerDetalleCorreccion(7L, 3L);
    }

    @Test
    void debeResolverCorreccionDesdeController() {
        ObjectNode resultado = jsonMapper.createObjectNode();
        resultado.put("estado", "APROBADA");
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);
        when(trabajadorService.resolverCorreccion(7L, 3L, request)).thenReturn(resultado);

        ResponseEntity<JsonNode> response = controller.resolver(3L, request, buildJwt("7"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("APROBADA", response.getBody().get("estado").asString());
        verify(trabajadorService).resolverCorreccion(7L, 3L, request);
    }

    @Test
    void debeRechazarCuandoJwtSubjectEsNulo() {
        Jwt jwtSinSub = new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("authorities", "hr.approve"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.listarPendientes(jwtSinSub));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(trabajadorService);
    }

    @Test
    void debeRechazarCuandoJwtSubjectInvalido() {
        Jwt jwtInvalido = new Jwt(
                "token-mock",
                Instant.now(),
                Instant.now().plusSeconds(3600),
                Map.of("alg", "none"),
                Map.of("sub", "no-un-numero", "authorities", "hr.approve"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.listarPendientes(jwtInvalido));

        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(trabajadorService);
    }

    @Test
    void debePropagarseForbiddenDelServicio() {
        when(trabajadorService.listarSolicitudesCorreccion(7L))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permisos"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.listarPendientes(buildJwt("7")));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void debePropagarse404DelServicio() {
        when(trabajadorService.obtenerDetalleCorreccion(7L, 99L))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "No disponible"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.obtenerDetalle(99L, buildJwt("7")));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void debePropagarse409DelServicio() {
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);
        when(trabajadorService.resolverCorreccion(7L, 3L, request))
                .thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "Ya resuelta"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.resolver(3L, request, buildJwt("7")));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void debeAdjuntarEvidenciaDesdeController() {
        ObjectNode resultado = jsonMapper.createObjectNode();
        resultado.put("idEvidencia", 10L);
        MockMultipartFile file = new MockMultipartFile(
                "archivo", "foto.png", "image/png", new byte[]{1, 2, 3});
        when(evidenciaService.adjuntarEvidencia(7L, 3L, file)).thenReturn(resultado);

        ResponseEntity<JsonNode> response = controller.adjuntarEvidencia(3L, file, buildJwt("7"));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(10L, response.getBody().get("idEvidencia").longValue());
        verify(evidenciaService).adjuntarEvidencia(7L, 3L, file);
    }

    @Test
    void debeObtenerUrlFirmadaDesdeController() {
        when(evidenciaService.generarUrlFirmada(7L, 3L))
                .thenReturn("https://storage.supabase.co/signed-url");

        ResponseEntity<Map<String, String>> response =
                controller.obtenerUrlFirmada(3L, buildJwt("7"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("https://storage.supabase.co/signed-url", response.getBody().get("url"));
        verify(evidenciaService).generarUrlFirmada(7L, 3L);
    }

    @Test
    void debeSolicitarCorreccionDesdeController() {
        ObjectNode resultado = jsonMapper.createObjectNode();
        resultado.put("idSolicitud", 99L);
        ObjectNode datos = jsonMapper.createObjectNode();
        datos.put("idTipoDocumento", 1);
        datos.put("numeroDocumento", "12345678");
        datos.put("motivo", "Error de digitacion en el numero de DNI original");

        when(trabajadorService.solicitarCorreccionDocumento(7L, 10L, datos)).thenReturn(resultado);

        ResponseEntity<JsonNode> response = controller.solicitarCorreccion(10L, datos, buildJwt("7"));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(99L, response.getBody().get("idSolicitud").longValue());
        verify(trabajadorService).solicitarCorreccionDocumento(7L, 10L, datos);
    }
}
