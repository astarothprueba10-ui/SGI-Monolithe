package monolithe.core_service.service;

import monolithe.core_service.dto.AgendarVisitaCrmRequest;
import monolithe.core_service.dto.ActualizarEstadoVisitaCrmRequest;
import monolithe.core_service.repository.CrmExpedienteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.time.OffsetDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class CrmExpedienteServiceTest {
    private CrmExpedienteRepository repository;
    private CrmExpedienteService service;

    @BeforeEach
    void preparar() {
        repository = mock(CrmExpedienteRepository.class);
        service = new CrmExpedienteService(repository, new JsonMapper());
    }

    @Test
    void consultaCatalogos() {
        when(repository.catalogos(5L)).thenReturn("{\"turnosVisita\":[\"11:00\",\"15:00\"]}");
        assertEquals(2, service.catalogos(5L).path("turnosVisita").size());
    }

    @Test
    void muestraDetalleDeProspecto() {
        when(repository.detalle(5L, 1L)).thenReturn("{\"prospecto\":{\"id_prospecto\":1},\"esComprador\":false}");
        assertEquals(1, service.detalle(5L, 1L).path("prospecto").path("id_prospecto").asInt());
    }

    @Test
    void listaVisitasEnArray() {
        when(repository.visitas(5L, 1L, 20)).thenReturn("[{\"id_visita\":8}]");
        assertEquals(1, service.listarVisitas(5L, 1L, 20).size());
    }

    @Test
    void registraAgendaConActorAutenticado() {
        OffsetDateTime fecha = OffsetDateTime.now().plusDays(5);
        var req = new AgendarVisitaCrmRequest(3L, fecha, "11:00", null, "Visita de prueba");
        when(repository.agendar(5L, 1L, 3L, fecha, "11:00", null, "Visita de prueba"))
                .thenReturn("{\"id_visita\":20,\"estado\":\"PROGRAMADA\"}");
        assertEquals(20, service.agendar(5L, 1L, req).path("id_visita").asInt());
    }

    @Test
    void rechazaTurnoFueraDeCatalogo() {
        var req = new AgendarVisitaCrmRequest(3L, OffsetDateTime.now().plusDays(5), "09:30", null, null);
        var e = assertThrows(ResponseStatusException.class, () -> service.agendar(5L, 1L, req));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void cambiaEstadoDeVisita() {
        when(repository.actualizarEstado(5L, 20L, "CONFIRMADA", null))
                .thenReturn("{\"id_visita\":20,\"estado\":\"CONFIRMADA\"}");
        var req = new ActualizarEstadoVisitaCrmRequest(" confirmada ", null);
        assertEquals("CONFIRMADA", service.actualizarVisita(5L, 20L, req).path("estado").asString());
    }

    @Test
    void rechazaIdentidadDeSesionInvalida() {
        var e = assertThrows(ResponseStatusException.class, () -> service.catalogos(0L));
        assertEquals(HttpStatus.UNAUTHORIZED, e.getStatusCode());
        verifyNoInteractions(repository);
    }

    @Test
    void transformaVisitaOcupadaEnConflicto() {
        when(repository.agendar(anyLong(), anyLong(), anyLong(), any(), anyString(), any(), any()))
                .thenThrow(new DataIntegrityViolationException("ERROR: VISITA_OCUPADA|Agenda duplicada"));
        var req = new AgendarVisitaCrmRequest(3L, OffsetDateTime.now().plusDays(5), "11:00", null, null);
        var e = assertThrows(ResponseStatusException.class, () -> service.agendar(5L, 1L, req));
        assertEquals(HttpStatus.CONFLICT, e.getStatusCode());
    }

    @Test
    void verificaPermisosDenegadosEnBaseDeDatos() {
        when(repository.detalle(5L, 1L)).thenThrow(new DataIntegrityViolationException("DENEGADO|Sin permiso"));
        var e = assertThrows(ResponseStatusException.class, () -> service.detalle(5L, 1L));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }
}
