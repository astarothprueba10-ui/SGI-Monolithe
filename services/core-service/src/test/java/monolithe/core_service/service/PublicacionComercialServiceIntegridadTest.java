package monolithe.core_service.service;

import monolithe.core_service.dto.PublicacionComercialRequest;
import monolithe.core_service.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicacionComercialServiceIntegridadTest {
    private final PublicacionComercialRepository repository = mock(PublicacionComercialRepository.class);
    private final ConfiguracionProyectoService configuracion = mock(ConfiguracionProyectoService.class);
    private final LoteRepository lotes = mock(LoteRepository.class);
    private final AjusteTipoLoteRepository ajustes = mock(AjusteTipoLoteRepository.class);
    private final SimulacionComercialService simulacion = mock(SimulacionComercialService.class);
    private final PublicacionComercialService service = new PublicacionComercialService(
            configuracion, repository, lotes, ajustes, simulacion, JsonMapper.builder().build());
    private final PublicacionComercialRequest request = new PublicacionComercialRequest(1, List.of(), null);

    @Test
    void previsualizacionIncompletaSeDetieneAntesDeConsultarInventario() {
        when(repository.puedeVerificarIntegridadPublicacion()).thenReturn(false);
        var error = assertThrows(ResponseStatusException.class, () -> service.previsualizar(1L, request));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verificarSinCambios();
    }

    @Test
    void publicacionIncompletaSeDetieneAntesDeBloquearOEscribir() {
        when(repository.puedeVerificarIntegridadPublicacion()).thenReturn(false);
        var error = assertThrows(ResponseStatusException.class, () -> service.publicar(1L, 1L, request));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatusCode());
        verificarSinCambios();
    }

    private void verificarSinCambios() {
        verify(repository).puedeVerificarIntegridadPublicacion();
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(configuracion, lotes, ajustes, simulacion);
    }
}
