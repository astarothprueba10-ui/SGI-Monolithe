package monolithe.core_service.service;

import monolithe.core_service.client.SupabaseStorageClient;
import monolithe.core_service.dto.ResolverRetrocesoCrmRequest;
import monolithe.core_service.dto.SolicitarRetrocesoCrmRequest;
import monolithe.core_service.repository.CrmRetrocesoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CrmRetrocesoServiceTest {

    private CrmRetrocesoRepository repository;
    private SupabaseStorageClient storageClient;
    private CrmRetrocesoService service;

    @BeforeEach
    void setUp() {
        repository = mock(CrmRetrocesoRepository.class);
        storageClient = mock(SupabaseStorageClient.class);
        service = new CrmRetrocesoService(repository, storageClient, new JsonMapper());
    }

    @Test
    void solicitaRetrocesoConExito() {
        when(repository.solicitarRetroceso(5L, 10L, "CONTACTADO", "CLIENTE_INDECISO", "Requiere mas tiempo"))
                .thenReturn("{\"id_solicitud\":1,\"estado\":\"PENDIENTE\"}");

        var req = new SolicitarRetrocesoCrmRequest("CONTACTADO", null, "CLIENTE_INDECISO", "Requiere mas tiempo", null);
        JsonNode res = service.solicitarRetroceso(5L, 10L, req);

        assertEquals(1L, res.path("id_solicitud").asLong());
        assertEquals("PENDIENTE", res.path("estado").asString());
        verify(repository).solicitarRetroceso(5L, 10L, "CONTACTADO", "CLIENTE_INDECISO", "Requiere mas tiempo");
    }

    @Test
    void solicitaRetrocesoRechazaCamposFaltantes() {
        var req = new SolicitarRetrocesoCrmRequest(null, null, "MOTIVO", null, null);
        var ex = assertThrows(ResponseStatusException.class, () -> service.solicitarRetroceso(5L, 10L, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void solicitaRetrocesoMapeaErrorDenegado() {
        when(repository.solicitarRetroceso(5L, 10L, "CONTACTADO", "MOTIVO", "Detalle"))
                .thenThrow(new DataIntegrityViolationException("DENEGADO|Solo el asesor asignado puede solicitar"));

        var req = new SolicitarRetrocesoCrmRequest("CONTACTADO", null, "MOTIVO", "Detalle", null);
        var ex = assertThrows(ResponseStatusException.class, () -> service.solicitarRetroceso(5L, 10L, req));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Solo el asesor asignado"));
    }

    @Test
    void resuelveRetrocesoAprobadoConExito() {
        when(repository.resolverRetroceso(1L, 20L, true, "Aprobado por gerencia"))
                .thenReturn("{\"id_solicitud\":20,\"estado\":\"APROBADA\"}");

        var req = new ResolverRetrocesoCrmRequest(true, null, "Aprobado por gerencia");
        JsonNode res = service.resolverRetroceso(1L, 20L, req);

        assertEquals("APROBADA", res.path("estado").asString());
        verify(repository).resolverRetroceso(1L, 20L, true, "Aprobado por gerencia");
    }

    @Test
    void resuelveRetrocesoRechazaSinDecision() {
        var req = new ResolverRetrocesoCrmRequest(null, null, "Sin decision");
        var ex = assertThrows(ResponseStatusException.class, () -> service.resolverRetroceso(1L, 20L, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void listaSolicitudesValidaRangoFechas() {
        OffsetDateTime ahora = OffsetDateTime.now(ZoneOffset.UTC);
        var ex = assertThrows(ResponseStatusException.class,
                () -> service.listarSolicitudes(1L, ahora, ahora.minusDays(1), null, null, 1, 15));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void listaSolicitudesConExito() {
        OffsetDateTime desde = OffsetDateTime.now(ZoneOffset.UTC).minusDays(7);
        OffsetDateTime hasta = OffsetDateTime.now(ZoneOffset.UTC);
        when(repository.listarSolicitudes(1L, desde, hasta, "PENDIENTE", "Juan", 1, 15, null))
                .thenReturn("{\"items\":[{\"id_solicitud\":1}],\"total\":1,\"pagina\":1,\"tamano\":15,\"paginas\":1}");

        JsonNode res = service.listarSolicitudes(1L, desde, hasta, "PENDIENTE", "Juan", 1, 15);
        assertTrue(res.isObject());
        assertEquals(1, res.path("total").asInt());
        assertEquals(1, res.path("items").size());
        assertEquals(1, res.path("pagina").asInt());
    }

    @Test
    void obtieneIndicadoresConExito() {
        OffsetDateTime desde = OffsetDateTime.now(ZoneOffset.UTC).minusDays(30);
        OffsetDateTime hasta = OffsetDateTime.now(ZoneOffset.UTC);
        when(repository.obtenerIndicadores(1L, desde, hasta, null))
                .thenReturn("{\"pendientes\":5,\"aprobadas\":12,\"rechazadas\":3}");

        JsonNode res = service.obtenerIndicadores(1L, desde, hasta);
        assertEquals(5, res.path("pendientes").asInt());
    }

    @Test
    void obtieneCatalogoMotivosConExito() {
        when(repository.catalogoMotivos(1L))
                .thenReturn("[{\"codigo\":\"CLIENTE_INDECISO\",\"nombre\":\"Cliente indeciso\"}]");

        JsonNode res = service.catalogoMotivos(1L);
        assertTrue(res.isArray());
        assertEquals("CLIENTE_INDECISO", res.get(0).path("codigo").asString());
    }

    @Test
    void rechazaActorSinIdentidad() {
        var ex = assertThrows(ResponseStatusException.class, () -> service.catalogoMotivos(0L));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void adjuntarEvidenciaRechazaArchivoNulo() {
        var ex = assertThrows(ResponseStatusException.class, () -> service.adjuntarEvidencia(1L, 5L, null));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void generarUrlFirmadaConExito() {
        when(repository.obtenerRutaEvidencia(1L, 5L)).thenReturn("solicitudes/5/test.jpg");
        when(storageClient.generarUrlFirmada(eq("crm-retrocesos-evidencias"), eq("solicitudes/5/test.jpg"), eq(300)))
                .thenReturn("https://signed-url.example/test.jpg");

        JsonNode res = service.generarUrlFirmada(1L, 5L);
        assertEquals("https://signed-url.example/test.jpg", res.path("url").asString());
        assertEquals(300, res.path("segundos").asInt());
    }

    @Test
    void miRetrocesoPendienteConExito() {
        when(repository.miRetrocesoPendiente(1L, 24L))
                .thenReturn("{\"id_solicitud\":5,\"estado\":\"PENDIENTE\",\"tiene_evidencia\":false}");

        JsonNode res = service.miRetrocesoPendiente(1L, 24L);
        assertEquals(5L, res.path("id_solicitud").asLong());
        assertEquals("PENDIENTE", res.path("estado").asString());
        assertFalse(res.path("tiene_evidencia").asBoolean());
    }
}
