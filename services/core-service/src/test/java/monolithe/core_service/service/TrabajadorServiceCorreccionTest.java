package monolithe.core_service.service;

import monolithe.core_service.dto.ResolverCorreccionRequest;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TrabajadorServiceCorreccionTest {

    private TrabajadorProcedureRepository repository;
    private TrabajadorService service;
    private JsonMapper jsonMapper;

    @BeforeEach
    void setUp() {
        repository = mock(TrabajadorProcedureRepository.class);
        jsonMapper = new JsonMapper();
        service = new TrabajadorService(repository, jsonMapper);
    }

    // --- listarSolicitudesCorreccion ---

    @Test
    void debeListarSolicitudesPendientesExitosamente() {
        ArrayNode lista = jsonMapper.createArrayNode();
        ObjectNode item = jsonMapper.createObjectNode();
        item.put("idSolicitud", 1L);
        lista.add(item);

        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(lista, "OK", null);
        when(repository.listarSolicitudesCorreccion(1L)).thenReturn(respuesta);

        JsonNode resultado = service.listarSolicitudesCorreccion(1L);

        assertNotNull(resultado);
        assertTrue(resultado.isArray());
        assertEquals(1, resultado.size());
    }

    @Test
    void debeRetornarListaVaciaSiResultadoEsNull() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(null, "OK", null);
        when(repository.listarSolicitudesCorreccion(1L)).thenReturn(respuesta);

        JsonNode resultado = service.listarSolicitudesCorreccion(1L);

        assertNotNull(resultado);
        assertTrue(resultado.isArray());
        assertEquals(0, resultado.size());
    }

    @Test
    void debeRechazarListarCuandoDenegado() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "DENEGADO", "Sin permisos");
        when(repository.listarSolicitudesCorreccion(99L)).thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.listarSolicitudesCorreccion(99L));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    // --- obtenerDetalleCorreccion ---

    @Test
    void debeObtenerDetalleExitosamente() {
        ObjectNode detalle = jsonMapper.createObjectNode();
        detalle.put("idSolicitud", 5L);
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(detalle, "OK", null);
        when(repository.obtenerDetalleCorreccion(1L, 5L)).thenReturn(respuesta);

        JsonNode resultado = service.obtenerDetalleCorreccion(1L, 5L);

        assertNotNull(resultado);
        assertTrue(resultado.isObject());
        assertEquals(5L, resultado.get("idSolicitud").longValue());
    }

    @Test
    void debeRechazarDetalleConIdInvalido() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.obtenerDetalleCorreccion(1L, 0L));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void debeRechazarDetalleCuandoNoDisponible() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "SOLICITUD_NO_DISPONIBLE", "No disponible");
        when(repository.obtenerDetalleCorreccion(anyLong(), anyLong())).thenReturn(respuesta);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.obtenerDetalleCorreccion(1L, 5L));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void debeRechazarDetalleConIdNulo() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.obtenerDetalleCorreccion(1L, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    // --- resolverCorreccion ---

    @Test
    void debeAprobarCorreccionExitosamente() {
        ObjectNode obj = jsonMapper.createObjectNode();
        obj.put("idSolicitud", 3L);
        obj.put("estado", "APROBADA");
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(obj, "OK", null);
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), eq("APROBAR"), any()))
                .thenReturn(respuesta);

        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);
        JsonNode resultado = service.resolverCorreccion(1L, 3L, request);

        assertNotNull(resultado);
        assertEquals("APROBADA", resultado.get("estado").asString());
    }

    @Test
    void debeRechazarCorreccionConMotivoValido() {
        ObjectNode obj = jsonMapper.createObjectNode();
        obj.put("estado", "RECHAZADA");
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(obj, "OK", null);
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), eq("RECHAZAR"), anyString()))
                .thenReturn(respuesta);

        String motivo = "El documento proporcionado no coincide con los registros oficiales.";
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("RECHAZAR", motivo);
        JsonNode resultado = service.resolverCorreccion(1L, 3L, request);

        assertNotNull(resultado);
        assertEquals("RECHAZADA", resultado.get("estado").asString());
    }

    @Test
    void debeRechazarResolucionConMotivoMuyCorto() {
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("RECHAZAR", "corto");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void debeRechazarResolucionSinMotivoParaRechazar() {
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("RECHAZAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void debeRechazarResolucionConIdSolicitudInvalido() {
        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, -1L, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void debeRechazarCuandoAutoresolucionDenegada() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "AUTORESOLUCION_DENEGADA", "No puede resolver su propia solicitud");
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), anyString(), any()))
                .thenReturn(respuesta);

        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void debeRechazarCuandoSolicitudYaResuelta() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "SOLICITUD_RESUELTA", "Ya fue resuelta");
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), anyString(), any()))
                .thenReturn(respuesta);

        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void debeRechazarCuandoEvidenciaObligatoria() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "EVIDENCIA_OBLIGATORIA", "Se requiere fotografia adjunta");
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), anyString(), any()))
                .thenReturn(respuesta);

        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void debeRechazarCuandoSolicitudNoEncontrada() {
        ResultadoProcedimiento respuesta = new ResultadoProcedimiento(
                null, "SOLICITUD_NO_ENCONTRADA", "No existe");
        when(repository.resolverCorreccionIdentidad(anyLong(), anyLong(), anyString(), any()))
                .thenReturn(respuesta);

        ResolverCorreccionRequest request = new ResolverCorreccionRequest("APROBAR", null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resolverCorreccion(1L, 3L, request));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}
